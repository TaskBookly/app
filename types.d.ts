interface Window {
	electron: {
		sidebar: {
			toggle: () => void;
			getState: () => Promise<boolean>;
			onState: (callback: (collapsed: boolean) => void) => void;
		};
		app: {
			getVersion: () => Promise<string>;
			getNodeEnv: () => Promise<string>;
		};
		onJumpToSection: (callback: (section: string) => void) => void;
	};
}
