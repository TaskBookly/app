import React, { createContext, useContext, useState, useEffect } from "react";
import { getPlatform } from "./config";

type Setting = { key: string; value: string };
type SettingsContextType = {
	settings: Setting[];
	setSetting: (key: string, value: string) => Promise<void>;
	getSetting: (key: string) => string;
	setSettingsState: React.Dispatch<React.SetStateAction<Setting[]>>;
	defaultSettings: Setting[];
};

const platform = getPlatform();

const defaultSettings: Setting[] = [
	{ key: "notifsFocus", value: "all" },
	{ key: "notifsTasks", value: "notifsOnly" },
	{ key: "theme", value: "dark" },
	{ key: "autoCheckForUpdates", value: "true" },
	{ key: "transitionPeriodsEnabled", value: "false" },
	{ key: "workPeriodDuration", value: "25" },
	{ key: "breakPeriodDuration", value: "10" },
	{ key: "transitionPeriodDuration", value: "3" },

	// Platform-specific
	...(platform === "windows" || platform === "linux" ? [{ key: "launchOnLogin", value: "false" }] : []),
	...(platform === "mac" ? [{ key: "touchBar", value: "true" }] : []),
];

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [settings, setSettingsState] = useState<Setting[]>(() => defaultSettings);

	useEffect(() => {
		const loadStoredSettings = async () => {
			try {
				if (typeof window !== "undefined" && window.electron) {
					const stored = await window.electron.settings.load();
					const merged = defaultSettings.map((def) => {
						const found = stored[def.key];
						return found !== undefined ? { key: def.key, value: found } : def;
					});
					const extras = Object.entries(stored)
						.filter(([key]) => !defaultSettings.some((def) => def.key === key))
						.map(([key, value]) => ({ key, value }));
					setSettingsState([...merged, ...extras]);
				}
			} catch (error) {
				console.error("Failed to load settings:", error);
			}
		};
		loadStoredSettings();
	}, []);

	const getSetting = React.useCallback(
		(key: string) => {
			const found = settings.find((s) => s.key === key)?.value;
			return typeof found === "string" ? found : defaultSettings.find((s) => s.key === key)?.value || "";
		},
		[settings]
	);

	const setSetting = async (key: string, value: string) => {
		setSettingsState((prev) => {
			let updated: Setting[];
			const exists = prev.some((s) => s.key === key);
			if (exists) {
				updated = prev.map((s) => (s.key === key ? { ...s, value } : s));
			} else {
				updated = [...prev, { key, value }];
			}
			if (typeof window !== "undefined" && window.electron) {
				window.electron.settings.set(key, value);
			}
			return updated;
		});
	};

	// Theme effect
	React.useEffect(() => {
		document.documentElement.setAttribute("data-theme", getSetting("theme"));
	}, [getSetting]);

	return <SettingsContext.Provider value={{ settings, setSetting, getSetting, setSettingsState, defaultSettings }}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
	const context = useContext(SettingsContext);
	if (!context) throw new Error("useSettings must be used within a SettingsProvider");
	return context;
};
