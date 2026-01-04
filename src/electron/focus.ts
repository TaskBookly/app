import { BrowserWindow, Notification } from "electron";
import { EventEmitter } from "events";
import SecretDataManager from "./bChargingManager.js";
import { clearDisRPC, startupDisRPC, updateDisRPC } from "./discordRPC.js";
import type { focusActivity } from "./discordRPC.js";
import { BUILT_IN_FOCUS_PRESETS, type FocusPreset } from "../common/focusPresets.js";

type SessionType = "none" | "work" | "break" | "transition";
type SessionStatus = "counting" | "paused" | "stopped";

interface FocusSessions {
	work: number;
	break: number;
	transition: number;
}

interface TimerData {
	session: SessionType;
	status: SessionStatus;
	timeLeft: number;
	chargesLeft: number;
	timeLeftTillNextCharge: number;
	chargeProgressPercentage: number;
	isOnCooldown: boolean;
	cooldownBreaksLeft: number;
	chargeUsedThisSession: boolean;
	expectedFinish?: number;
}

class FocusTimer extends EventEmitter {
	private readonly mainWindow: BrowserWindow;
	private readonly secretDataManager: SecretDataManager;
	private readonly handleWindowClosed: () => void;
	private readonly tickIntervalMs = 100;
	private disposed: boolean;

	private static settings: Record<string, string> = {};
	private static activePreset: FocusPreset = BUILT_IN_FOCUS_PRESETS[0];

	private static sessions: FocusSessions;
	private static activeTimers: Set<FocusTimer> = new Set();

	private _currentSession: SessionType;
	private _sessionStatus: SessionStatus;
	private _timeLeftInSession: number;
	private _chargeUsedThisSession: boolean;
	private intervalId: NodeJS.Timeout | null;

	private previousSession: "work" | "break";
	private sessionStartTime: number;
	private pausedTime: number;
	private totalPausedDuration: number;
	private totalAddedTime: number;
	private lastWorkTimeUpdate: number = 0;

	constructor(window: BrowserWindow, settings: Record<string, string> = {}, activePreset?: FocusPreset) {
		super(); // Initialize EventEmitter
		this.mainWindow = window;
		this.secretDataManager = SecretDataManager.getInstance();
		this.handleWindowClosed = () => this.dispose();

		FocusTimer.settings = settings;
		if (activePreset) {
			FocusTimer.activePreset = activePreset;
		}
		FocusTimer.updateSessionDurations();

		// Initialize charge progress with current settings
		if (FocusTimer.settings.breakChargingEnabled === "true") {
			const workTimePerCharge = parseInt(FocusTimer.settings.workTimePerCharge || "60");
			this.secretDataManager.initializeChargeProgress(workTimePerCharge);
		}

		this._currentSession = "none";
		this._sessionStatus = "stopped";
		this._timeLeftInSession = 0;
		this._chargeUsedThisSession = false;
		this.intervalId = null;
		this.disposed = false;

		this.previousSession = "work";
		this.sessionStartTime = 0;
		this.pausedTime = 0;
		this.totalPausedDuration = 0;
		this.totalAddedTime = 0;
		this.mainWindow.once("closed", this.handleWindowClosed);

		FocusTimer.activeTimers.add(this);
	}

	public static updateSettings(settings: Record<string, string>): void {
		const previousPresence = FocusTimer.settings.discordRichPresence;
		FocusTimer.settings = settings;
		FocusTimer.updateSessionDurations();

		// Recalculate charge progress if break charging is enabled
		if (FocusTimer.settings.breakChargingEnabled === "true") {
			const workTimePerCharge = parseInt(FocusTimer.settings.workTimePerCharge || "60");
			const secretDataManager = SecretDataManager.getInstance();
			secretDataManager.initializeChargeProgress(workTimePerCharge);
		}

		if (FocusTimer.settings.discordRichPresence !== "true") {
			clearDisRPC();
			return;
		}

		startupDisRPC();

		if (previousPresence !== "true") {
			let updated = false;
			for (const timer of FocusTimer.activeTimers) {
				if (timer.session !== "none" && timer.status !== "stopped") {
					timer.forceDataUpdate();
					updated = true;
					break;
				}
			}
			if (!updated) {
				clearDisRPC();
			}
		}
	}

	// Force update of timer data (used for initialization)
	public forceDataUpdate(): void {
		if (this.disposed) {
			return;
		}
		this.secretDataManager.forceUpdate();
		this.emitTimerUpdate("action");
	}

	private emitDisRPCUpdate(data: TimerData) {
		if (FocusTimer.settings.discordRichPresence !== "true") {
			return;
		}

		if (data.session === "none" || data.status === "stopped") {
			clearDisRPC();
			return;
		}

		const periodType: focusActivity["periodType"] = data.session === "transition" ? "transition" : data.session;
		let periodStartUnix: number | undefined;
		let periodEndUnix: number | undefined;

		if (data.status === "counting" && typeof data.expectedFinish === "number") {
			periodEndUnix = Math.floor(data.expectedFinish / 1000);
			const periodStartEpochMs = this.sessionStartTime + this.totalPausedDuration;
			periodStartUnix = Math.floor(periodStartEpochMs / 1000);
		}

		const payload: focusActivity = {
			periodType,
			periodStartUnix,
			periodEndUnix,
		};

		updateDisRPC(payload);
	}

	private emitTimerUpdate(eventType: "tick" | "action" | "sessionChange"): void {
		if (this.disposed) {
			return;
		}

		if (!this.hasLiveRenderer()) {
			this.dispose();
			return;
		}
		const secretData = this.secretDataManager.getChargeData();
		const workTimePerCharge = parseFloat(FocusTimer.settings.workTimePerCharge || "60") * 60; // Convert to seconds
		const breakChargeCooldown = parseInt(FocusTimer.settings.breakChargeCooldown || "1");

		// Calculate progress percentage properly
		let chargeProgressPercentage = 0;
		if (workTimePerCharge > 0) {
			chargeProgressPercentage = (secretData.totalWorkTimeAccumulated / workTimePerCharge) * 100;
			chargeProgressPercentage = Math.min(Math.max(chargeProgressPercentage, 0), 100); // Clamp between 0-100
		}

		// Check if user is on cooldown
		const isOnCooldown = secretData.breakChargesSinceLastUse < breakChargeCooldown;
		const cooldownBreaksLeft = Math.max(0, breakChargeCooldown - secretData.breakChargesSinceLastUse);

		const data: TimerData = {
			session: this.session,
			status: this.status,
			timeLeft: this.timeLeft,
			chargesLeft: secretData.currentCharges,
			timeLeftTillNextCharge: secretData.timeLeftTillNextCharge,
			chargeProgressPercentage: chargeProgressPercentage,
			isOnCooldown: isOnCooldown,
			cooldownBreaksLeft: cooldownBreaksLeft,
			chargeUsedThisSession: this.chargeUsedThisSession,
		};

		// Compute a precise expected-finish timestamp (ms) to avoid renderer-side
		// rounding errors when constructing a Date from integer seconds.
		// Formula: sessionStartTime + sessionDurationMs + totalAddedTimeMs + totalPausedDuration
		if (this.session !== "none" && this.sessionStartTime > 0) {
			const sessionDurationMs = FocusTimer.sessions[this.session] * 60 * 1000;
			data.expectedFinish = this.sessionStartTime + sessionDurationMs + this.totalAddedTime * 1000 + this.totalPausedDuration;
		}
		if (eventType === "action" || eventType === "sessionChange") {
			this.emitDisRPCUpdate(data);
		}
		this.emit("timer-update", eventType, data);
	}

	private applyPresetUpdate(): void {
		if (this.disposed) {
			return;
		}
		if (this.session === "none") {
			this.emitTimerUpdate("action");
			return;
		}

		const sessionDurationMinutes = FocusTimer.sessions[this.session];
		if (typeof sessionDurationMinutes !== "number" || !Number.isFinite(sessionDurationMinutes)) {
			return;
		}

		const sessionDurationSeconds = Math.max(1, Math.floor(sessionDurationMinutes * 60));

		if (this.status === "stopped") {
			this.timeLeft = sessionDurationSeconds;
			this.emitTimerUpdate("action");
			return;
		}

		const referenceTime = this.status === "paused" ? this.pausedTime : Date.now();
		const elapsedTime = Math.floor((referenceTime - this.sessionStartTime - this.totalPausedDuration) / 1000);
		const newTimeLeft = sessionDurationSeconds - elapsedTime + this.totalAddedTime;

		if (newTimeLeft <= 0) {
			this.onSessionComplete();
			return;
		}

		this.timeLeft = newTimeLeft;
		if (this.session === "work") {
			this.lastWorkTimeUpdate = referenceTime;
		}
		this.emitTimerUpdate("action");
	}

	private static updateSessionDurations(): void {
		const preset = FocusTimer.activePreset ?? BUILT_IN_FOCUS_PRESETS[0];
		const workMinutes = Number.isFinite(preset.workDurationMinutes) ? preset.workDurationMinutes : BUILT_IN_FOCUS_PRESETS[0].workDurationMinutes;
		const breakMinutes = Number.isFinite(preset.breakDurationMinutes) ? preset.breakDurationMinutes : BUILT_IN_FOCUS_PRESETS[0].breakDurationMinutes;
		const transitionMinutesRaw = parseFloat(FocusTimer.settings.transitionPeriodDuration);
		const transitionMinutes = Number.isFinite(transitionMinutesRaw) ? transitionMinutesRaw : 0;

		FocusTimer.sessions = {
			work: workMinutes,
			break: breakMinutes,
			transition: transitionMinutes,
		};
	}

	public static setActivePreset(preset: FocusPreset): void {
		FocusTimer.activePreset = preset;
		FocusTimer.updateSessionDurations();
		for (const timer of FocusTimer.activeTimers) {
			timer.applyPresetUpdate();
		}
	}
	public dispose(): void {
		if (this.disposed) {
			return;
		}

		this.disposed = true;
		this.mainWindow.removeListener("closed", this.handleWindowClosed);

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		this._currentSession = "none";
		this._sessionStatus = "stopped";
		this._timeLeftInSession = 0;
		this._chargeUsedThisSession = false;
		this.sessionStartTime = 0;
		this.totalPausedDuration = 0;
		this.totalAddedTime = 0;
		this.lastWorkTimeUpdate = 0;

		this.removeAllListeners();
		this.secretDataManager.cleanup();
		FocusTimer.activeTimers.delete(this);

		if (FocusTimer.settings.discordRichPresence === "true") {
			clearDisRPC();
		}
	}

	private hasLiveRenderer(): boolean {
		return !this.mainWindow.isDestroyed() && !this.mainWindow.webContents.isDestroyed();
	}

	private safeSendToRenderer(channel: string, ...args: unknown[]): void {
		if (this.disposed || !this.hasLiveRenderer()) {
			return;
		}

		try {
			this.mainWindow.webContents.send(channel, ...args);
		} catch (error) {
			if (error instanceof Error && error.message.includes("Object has been destroyed")) {
				this.dispose();
			} else {
				console.error("FocusTimer failed to send message:", error);
			}
		}
	}

	public start(): void {
		if (this.disposed) {
			return;
		}
		if (this.status === "stopped") {
			FocusTimer.updateSessionDurations();

			this.timeLeft = FocusTimer.sessions.work * 60; // Convert to seconds
			this.session = "work";
			this.status = "counting";
			this.sessionStartTime = Date.now();
			this.totalPausedDuration = 0;
			this.totalAddedTime = 0;
			this.lastWorkTimeUpdate = Date.now();

			this.intervalId = setInterval(() => {
				this.tick();
			}, this.tickIntervalMs);

			this.emitTimerUpdate("action");
		}
	}

	public resume(): void {
		if (this.disposed) {
			return;
		}
		if (this.session === "work" && this.status === "paused") {
			this.status = "counting";
			// Add the paused duration to total paused time
			this.totalPausedDuration += Date.now() - this.pausedTime;
			// Reset work time tracking
			this.lastWorkTimeUpdate = Date.now();
			this.emitTimerUpdate("action");
		}
	}

	public pause(): void {
		if (this.disposed) {
			return;
		}
		if (this.session === "work" && this.status === "counting") {
			// Track work time up to pause point
			if (FocusTimer.settings.breakChargingEnabled === "true") {
				const now = Date.now();
				const workTimeToAdd = Math.max(0, (now - this.lastWorkTimeUpdate) / 1000);
				if (workTimeToAdd > 0) {
					this.secretDataManager.addWorkTime(workTimeToAdd);
					const workTimePerCharge = parseInt(FocusTimer.settings.workTimePerCharge || "60");
					this.secretDataManager.updateChargeProgress(workTimePerCharge);
				}
			}

			this.status = "paused";
			this.pausedTime = Date.now();
			this.emitTimerUpdate("action");
		}
	}

	public stop(): void {
		if (this.disposed) {
			return;
		}
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		this.session = "none";
		this.status = "stopped";
		this.timeLeft = 0;
		this.sessionStartTime = 0;
		this.pausedTime = 0;
		this.totalPausedDuration = 0;
		this.totalAddedTime = 0;
		this.emitTimerUpdate("action");
	}

	public addTime(seconds: number): void {
		if (this.disposed) {
			return;
		}
		if (this.session === "work" && this.status !== "stopped") {
			if (seconds > 1) {
				this.totalAddedTime += seconds;
			} else {
				this.totalAddedTime++;
			}

			if (this.status === "paused") {
				const elapsedTime = Math.floor((this.pausedTime - this.sessionStartTime - this.totalPausedDuration) / 1000);
				const sessionDuration = FocusTimer.sessions[this.session] * 60;
				this.timeLeft = sessionDuration - elapsedTime + this.totalAddedTime;
			}

			this.emitTimerUpdate("action");
		}
	}

	public useBreakCharge(): boolean {
		if (this.disposed) {
			return false;
		}
		const cooldownPeriod = parseInt(FocusTimer.settings.breakChargeCooldown || "0");
		const extensionAmount = parseInt(FocusTimer.settings.breakChargeExtensionAmount || "5") * 60; // Convert to seconds

		if (!this.chargeUsedThisSession && this.session === "break" && this.secretDataManager.useCharge(cooldownPeriod)) {
			this.chargeUsedThisSession = true;
			// Extend the current break time
			this.totalAddedTime += extensionAmount;
			this.emitTimerUpdate("action");
			return true;
		}
		return false;
	}

	private tick(): void {
		if (this.disposed) {
			return;
		}
		if (this.session !== "none" && this.status === "counting") {
			const now = Date.now();
			const elapsedTime = Math.floor((now - this.sessionStartTime - this.totalPausedDuration) / 1000);
			const sessionDuration = FocusTimer.sessions[this.session] * 60;
			const newTimeLeft = sessionDuration - elapsedTime + this.totalAddedTime;

			// Track work time for break charges (only update every 5 seconds to reduce I/O)
			if (this.session === "work" && FocusTimer.settings.breakChargingEnabled === "true") {
				const timeSinceLastUpdate = now - this.lastWorkTimeUpdate;
				if (timeSinceLastUpdate >= 5000) {
					// Update every 5 seconds
					const workTimeToAdd = Math.max(0, timeSinceLastUpdate / 1000); // Ensure non-negative
					this.secretDataManager.addWorkTime(workTimeToAdd);
					const workTimePerCharge = parseInt(FocusTimer.settings.workTimePerCharge || "60");
					this.secretDataManager.updateChargeProgress(workTimePerCharge);
					this.lastWorkTimeUpdate = now;
				}
			}

			if (newTimeLeft <= 0) {
				// Handle any remaining work time before session ends
				if (this.session === "work" && FocusTimer.settings.breakChargingEnabled === "true") {
					const remainingWorkTime = (now - this.lastWorkTimeUpdate) / 1000;
					if (remainingWorkTime > 0) {
						this.secretDataManager.addWorkTime(remainingWorkTime);
						const workTimePerCharge = parseInt(FocusTimer.settings.workTimePerCharge || "60");
						this.secretDataManager.updateChargeProgress(workTimePerCharge);
					}
				}
				this.onSessionComplete();
			} else {
				this.timeLeft = newTimeLeft;
				this.emitTimerUpdate("tick");
			}
		}
	}

	private onSessionComplete(): void {
		if (this.disposed) {
			return;
		}
		if (Notification.isSupported() && FocusTimer.settings.notifsFocus === "all") {
			const notif = new Notification({
				title: `Your ${this.session} session has ended!`,
				urgency: "critical",
				silent: true,
			});
			notif.on("click", () => {
				if (this.hasLiveRenderer()) {
					try {
						this.mainWindow.focus();
					} catch (error) {
						console.debug("FocusTimer: unable to focus main window after notification", error);
					}
					this.safeSendToRenderer("jumpto-section", "focus");
				}
			});

			notif.show();
		}
		this.safeSendToRenderer("play-sound", "notifs/sessionComplete.ogg");

		this.nextSession();
	}

	private nextSession(): void {
		if (this.disposed) {
			return;
		}
		if (this.session !== "none") {
			this.chargeUsedThisSession = false;

			// Increment break sessions count if transitioning from break
			if (this.session === "break") {
				this.secretDataManager.incrementBreakSessionsSinceLastUse();
			}

			FocusTimer.updateSessionDurations();

			if (this.session === "work" || this.session === "break") {
				// Check if transition periods are enabled
				if (FocusTimer.settings["transitionPeriodsEnabled"] === "true") {
					this.previousSession = this.session;
					this.session = "transition";
				} else {
					// Skip transition and go directly to next session
					this.previousSession = this.session;
					if (this.session === "work") {
						this.session = "break";
					} else if (this.session === "break") {
						this.session = "work";
					}
				}
			} else if (this.session === "transition") {
				if (this.previousSession === "work") {
					this.session = "break";
				} else if (this.previousSession === "break") {
					this.session = "work";
				}
			}

			this.timeLeft = FocusTimer.sessions[this.session] * 60;
			// Reset timing for new session
			this.sessionStartTime = Date.now();
			this.totalPausedDuration = 0;
			this.totalAddedTime = 0;
			this.lastWorkTimeUpdate = Date.now();
			this.emitTimerUpdate("sessionChange");
		}
	}

	public get session(): SessionType {
		return this._currentSession;
	}

	public get status(): SessionStatus {
		return this._sessionStatus;
	}

	public get timeLeft(): number {
		return this._timeLeftInSession;
	}

	public get chargesLeft(): number {
		return this.secretDataManager.getCurrentCharges();
	}

	public get isOnCooldown(): boolean {
		const breakChargeCooldown = parseInt(FocusTimer.settings.breakChargeCooldown || "1");
		const secretData = this.secretDataManager.getChargeData();
		return secretData.breakChargesSinceLastUse < breakChargeCooldown;
	}

	public get chargeUsedThisSession(): boolean {
		return this._chargeUsedThisSession;
	}

	private set session(value: SessionType) {
		this._currentSession = value;
	}

	private set status(value: SessionStatus) {
		this._sessionStatus = value;
	}

	private set timeLeft(value: number) {
		if (value > 0) {
			this._timeLeftInSession = Math.trunc(value);
		} else {
			this._timeLeftInSession = 0;
		}
	}

	private set chargeUsedThisSession(value: boolean) {
		this._chargeUsedThisSession = value;
	}
}

export default FocusTimer;
export type { TimerData, SessionType, SessionStatus };
