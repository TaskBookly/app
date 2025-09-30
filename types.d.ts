interface Window {
	electron: {
		sidebar: {
			toggle: () => void;
			getState: () => Promise<boolean>;
			onState: (callback: (collapsed: boolean) => void) => void;
		};
		build: {
			getVersion: () => Promise<string>;
			getNodeEnv: () => Promise<string>;
			getPlatform: () => Promise<NodeJS.Platform>;
			getElectronVersion: () => Promise<string>;
			getChromeVersion: () => Promise<string>;
		};
		focus: {
			start: () => void;
			pause: () => void;
			resume: () => void;
			stop: () => void;
			addTime: (seconds: number) => void;
			useBreakCharge: () => Promise<boolean>;
			requestDataUpdate: () => void;
			onTimerUpdate: (callback: (data: TimerData) => void) => void;
		};
		sound: {
			onplaySound: (callback: (soundPath: string) => void) => void;
		};
		system: {
			getTheme: () => Promise<string>;
			onThemeChange: (callback: (theme: string) => void) => void;
		};
		settings: {
			load: () => Promise<Record<string, string>>;
			get: (key: string) => Promise<string>;
			set: (key: string, value: string) => Promise<boolean>;
		};
		window: {
			minimize: () => void;
			maximize: () => void;
			close: () => void;
			isMaximized: () => Promise<boolean>;
			onStateChanged: (callback: (state: { maximized: boolean }) => void) => void;
		};
		onJumpToSection: (callback: (section: string) => void) => void;
		openUserData: () => Promise<void>;
	};
}

interface TimerData {
	session: "none" | "work" | "break" | "transition";
	status: "counting" | "paused" | "stopped";
	timeLeft: number;
	chargesLeft: number;
	timeLeftTillNextCharge: number;
	chargeProgressPercentage: number;
	isOnCooldown: boolean;
	cooldownBreaksLeft: number;
	chargeUsedThisSession: boolean;
	expectedFinish?: number;
}
