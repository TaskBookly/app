interface TimerData {
	session: "none" | "work" | "break" | "transition";
	status: "counting" | "paused" | "stopped";
	timeLeft: number;
	chargesLeft: number;
}

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
		};
		focus: {
			start: () => void;
			pause: () => void;
			resume: () => void;
			stop: () => void;
			addTime: (seconds: number) => void;
			useBreakCharge: () => Promise<boolean>;
			onTimerUpdate: (callback: (data: TimerData) => void) => () => void;
		};
		onJumpToSection: (callback: (section: string) => void) => void;
	};
}
