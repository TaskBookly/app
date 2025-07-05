import { Notification } from "electron";
import { EventEmitter } from "events";

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
}

class FocusTimer extends EventEmitter {
	private static breakCharges: number = 3;
	private static readonly sessions: FocusSessions = {
		work: 20,
		break: 10,
		transition: 5,
	};

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

	constructor() {
		super();
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

	private emitTimerUpdate(): void {
		const data: TimerData = {
			session: this.session,
			status: this.status,
			timeLeft: this.timeLeft,
			chargesLeft: this.chargesLeft,
		};
		this.emit("timer-update", data);
	}

	public start(): void {
		if (this.status === "stopped") {
			this.timeLeft = FocusTimer.sessions.work * 60; // Convert to seconds
			this.session = "work";
			this.status = "counting";
			this.sessionStartTime = Date.now();
			this.totalPausedDuration = 0;
			this.totalAddedTime = 0;

			this.intervalId = setInterval(() => {
				this.tick();
			}, 100);

			this.emitTimerUpdate();
		}
	}

	public resume(): void {
		if (this.session === "work" && this.status === "paused") {
			this.status = "counting";
			// Add the paused duration to total paused time
			this.totalPausedDuration += Date.now() - this.pausedTime;
			this.emitTimerUpdate();
		}
	}

	public pause(): void {
		if (this.session === "work" && this.status === "counting") {
			this.status = "paused";
			this.pausedTime = Date.now();
			this.emitTimerUpdate();
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
		this.emitTimerUpdate();
	}

	public addTime(seconds: number): void {
		if (this.session === "work" && this.status !== "stopped") {
			if (seconds > 1) {
				this.totalAddedTime += seconds;
			} else {
				this.totalAddedTime++;
			}
			this.emitTimerUpdate();
		}
	}

	public useBreakCharge(): boolean {
		if (!this.chargeUsedThisSession && this.session === "break" && FocusTimer.breakCharges > 0) {
			this.chargeUsedThisSession = true;
			FocusTimer.breakCharges--;
			this.emitTimerUpdate();
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

			if (newTimeLeft <= 0) {
				this.onSessionComplete();
			} else {
				this.timeLeft = newTimeLeft;
				this.emitTimerUpdate();
			}
		}
	}

	private onSessionComplete(): void {
		if (Notification.isSupported()) {
			const notif = new Notification({
				title: "Focus session has ended!",
			});

			notif.show();
		}

		this.nextSession();
	}

	private nextSession(): void {
		if (this.session !== "none") {
			this.chargeUsedThisSession = false;

			if (this.session === "work" || this.session === "break") {
				this.previousSession = this.session;
				this.session = "transition";
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
			this.emitTimerUpdate();
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
		return FocusTimer.breakCharges;
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
