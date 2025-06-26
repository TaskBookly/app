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
			sendStatus: (status: "counting" | "paused" | "stopped", session: "work" | "break" | "transition", timeLeft: number) => void;
			onAction: (callback: (action: string, data?: any) => void) => void;
			removeActionListener: (callback: (action: string, data?: any) => void) => void;
		};
		onJumpToSection: (callback: (section: string) => void) => void;
	};
}
