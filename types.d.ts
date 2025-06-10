interface Window {
	electron: {
		sidebar: {
			toggle: () => void;
			getState: () => Promise<boolean>;
			onState: (callback: (collapsed: boolean) => void) => void;
		};
		onJumpToSection: (callback: (section: string) => void) => void;
	};
}
