interface Window {
	app: {
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
		onJumpToSection: (callback: (section: string) => void) => void;
	};
}
