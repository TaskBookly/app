import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { getDefaultSettings } from "../../common/settingsDefaults";

type Setting = { key: string; value: string };
type SettingsContextType = {
	settings: Setting[];
	setSetting: (key: string, value: string) => Promise<void>;
	getSetting: (key: string) => string;
	setSettingsState: Dispatch<SetStateAction<Setting[]>>;
	defaultSettings: Setting[];
};

const getDefaultSettingsArray = async (): Promise<Setting[]> => {
	if (typeof window !== "undefined" && window.electron) {
		const platform = await window.electron.build.getPlatform();
		const defaultsObj = getDefaultSettings(platform);
		return Object.entries(defaultsObj).map(([key, value]) => ({ key, value }));
	}
	return [];
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
	children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
	const [defaultSettings, setDefaultSettings] = useState<Setting[]>([]);
	const [settings, setSettingsState] = useState<Setting[]>([]);

	useEffect(() => {
		const initializeDefaults = async () => {
			const defaults = await getDefaultSettingsArray();
			setDefaultSettings(defaults);
			setSettingsState(defaults);
		};
		initializeDefaults();
	}, []);

	useEffect(() => {
		if (defaultSettings.length === 0) return;

		const loadStoredSettings = async () => {
			try {
				if (typeof window !== "undefined" && window.electron) {
					const stored = await window.electron.settings.load();
					const merged = defaultSettings.map((def: Setting) => {
						const found = stored[def.key];
						return found !== undefined ? { key: def.key, value: found } : def;
					});
					setSettingsState(merged);
				}
			} catch (error) {
				console.error("Failed to load settings:", error);
			}
		};
		loadStoredSettings();
	}, [defaultSettings]);

	const getSetting = useCallback(
		(key: string) => {
			const found = settings.find((s: Setting) => s.key === key)?.value;
			return typeof found === "string" ? found : defaultSettings.find((s: Setting) => s.key === key)?.value || "";
		},
		[settings, defaultSettings]
	);

	const setSetting = async (key: string, value: string) => {
		setSettingsState((prev) => {
			const exists = prev.some((s) => s.key === key);
			if (exists) {
				return prev.map((s) => (s.key === key ? { ...s, value } : s));
			} else {
				return [...prev, { key, value }];
			}
		});

		if (typeof window !== "undefined" && window.electron) {
			await window.electron.settings.set(key, value);
		}
	};

	useEffect(() => {
		const applyTheme = async () => {
			const theme = getSetting("theme");
			if (theme === "system") {
				const systemTheme = (await window.electron.system.getTheme()) ?? "dark";
				document.documentElement.setAttribute("data-theme", systemTheme);
			} else {
				document.documentElement.setAttribute("data-theme", theme);
			}
		};
		applyTheme();
	}, [getSetting]);

	useEffect(() => {
		const handleThemeChange = (theme: string) => {
			if (getSetting("theme") === "system") {
				document.documentElement.setAttribute("data-theme", theme);
			}
		};

		const cleanup = window.electron.system.onThemeChange(handleThemeChange);
		return cleanup;
	}, [getSetting]);

	return <SettingsContext.Provider value={{ settings, setSetting, getSetting, setSettingsState, defaultSettings }}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
	const context = useContext(SettingsContext);
	if (!context) throw new Error("useSettings must be used within a SettingsProvider");
	return context;
};
