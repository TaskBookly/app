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
			onTimerUpdate: (callback: (data: TimerData) => void) => void;
		};
		sound: {
			onplaySound: (callback: (soundPath: string) => void) => void;
		};
		settings: {
			load: () => Promise<Record<string, string>>;
			get: (key: string) => Promise<string>;
			set: (key: string, value: string) => Promise<boolean>;
		};
		onJumpToSection: (callback: (section: string) => void) => void;
	};
}
