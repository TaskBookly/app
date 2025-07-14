import { BrowserWindow, Notification } from "electron";
import { EventEmitter } from "events";
import SecretDataManager from "./bChargingManager.js";

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
}

class FocusTimer extends EventEmitter {
	private readonly mainWindow: BrowserWindow;
	private readonly secretDataManager: SecretDataManager;

	private static settings: Record<string, string> = {};

	private static sessions: FocusSessions;

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

	constructor(window: BrowserWindow, settings: Record<string, string> = {}) {
		super(); // Initialize EventEmitter
		this.mainWindow = window;
		this.secretDataManager = SecretDataManager.getInstance();

		FocusTimer.settings = settings;
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

		this.previousSession = "work";
		this.sessionStartTime = 0;
		this.pausedTime = 0;
		this.totalPausedDuration = 0;
		this.totalAddedTime = 0;
	}

	public static updateSettings(settings: Record<string, string>): void {
		FocusTimer.settings = settings;

		// Recalculate charge progress if break charging is enabled
		if (FocusTimer.settings.breakChargingEnabled === "true") {
			const workTimePerCharge = parseInt(FocusTimer.settings.workTimePerCharge || "60");
			const secretDataManager = SecretDataManager.getInstance();
			secretDataManager.initializeChargeProgress(workTimePerCharge);
		}
	}

	// Force update of timer data (used for initialization)
	public forceDataUpdate(): void {
		this.secretDataManager.forceUpdate();
		this.emitTimerUpdate("action");
	}

	private emitTimerUpdate(eventType: "tick" | "action" | "sessionChange"): void {
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
		this.emit("timer-update", eventType, data);
	}

	private static updateSessionDurations(): void {
		FocusTimer.sessions = {
			work: parseFloat(FocusTimer.settings.workPeriodDuration),
			break: parseFloat(FocusTimer.settings.breakPeriodDuration),
			transition: parseFloat(FocusTimer.settings.transitionPeriodDuration),
		};
	}

	public start(): void {
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
			}, 100);

			this.emitTimerUpdate("action");
		}
	}

	public resume(): void {
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
		if (Notification.isSupported() && (FocusTimer.settings.notifsFocus === "notifsOnly" || FocusTimer.settings.notifsFocus === "all")) {
			const notif = new Notification({
				title: `Your ${this.session} session has ended!`,
				urgency: "critical",
				silent: true,
			});
			notif.on("click", () => {
				this.mainWindow.focus();
				this.mainWindow.webContents.send("jumpto-section", "focus");
			});

			notif.show();
		}
		if (FocusTimer.settings.notifsFocus === "soundOnly" || FocusTimer.settings.notifsFocus === "all") {
			if (this.session === "transition") {
				this.mainWindow.webContents.send("play-sound", "notifs/sessionTransition.ogg");
			} else {
				this.mainWindow.webContents.send("play-sound", "notifs/sessionComplete.ogg");
			}
		}

		this.nextSession();
	}

	private nextSession(): void {
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
