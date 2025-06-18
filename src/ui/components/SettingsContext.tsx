import React, { createContext, useContext, useState, useEffect } from "react";
import { getPlatform } from "./config";

type Setting = { key: string; value: string };
type SettingsContextType = {
	settings: Setting[];
	setSetting: (key: string, value: string) => void;
	getSetting: (key: string) => string;
	setSettingsState: React.Dispatch<React.SetStateAction<Setting[]>>;
	defaultSettings: Setting[];
};

const platform = getPlatform();

const defaultSettings: Setting[] = [
	{ key: "notifs:focus", value: "all" },
	{ key: "notifs:tasks", value: "notifsOnly" },
	{ key: "theme", value: "dark" },
	{ key: "autoCheckForUpdates", value: "true" },
	{ key: "transitionPeriodsEnabled", value: "true" },
	{ key: "transitionPeriodDuration", value: "3" },

	// Platform-specific
	...(platform === "mac" ? [{ key: "touchBar", value: "true" }] : []),
	...(platform === "windows" ? [{ key: "launchOnLogin", value: "false" }] : []),
];

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [settings, setSettingsState] = useState<Setting[]>(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("settings");
			if (stored) {
				try {
					const loaded: Setting[] = JSON.parse(stored);
					const merged = defaultSettings.map((def) => {
						const found = loaded.find((s) => s.key === def.key);
						return found ? found : def;
					});
					const extras = loaded.filter((s) => !defaultSettings.some((def) => def.key === s.key));
					return [...merged, ...extras];
				} catch {
					return defaultSettings;
				}
			}
		}
		return defaultSettings;
	});

	useEffect(() => {
		if (typeof window !== "undefined") {
			try {
				localStorage.setItem("settings", JSON.stringify(settings));
			} catch (error) {
				console.error("Failed to save settings to localStorage:", error);
			}
		}
	}, [settings]);

	const getSetting = React.useCallback(
		(key: string) => {
			const found = settings.find((s) => s.key === key)?.value;
			return typeof found === "string" ? found : defaultSettings.find((s) => s.key === key)?.value || "";
		},
		[settings]
	);

	// Theme effect
	React.useEffect(() => {
		document.documentElement.setAttribute("data-theme", getSetting("theme"));
	}, [getSetting]);

	const setSetting = (key: string, value: string) => {
		setSettingsState((prev) => {
			let updated: Setting[];
			const exists = prev.some((s) => s.key === key);
			if (exists) {
				updated = prev.map((s) => (s.key === key ? { ...s, value } : s));
			} else {
				updated = [...prev, { key, value }];
			}
			return updated;
		});
	};

	return <SettingsContext.Provider value={{ settings, setSetting, getSetting, setSettingsState, defaultSettings }}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
	const context = useContext(SettingsContext);
	if (!context) throw new Error("useSettings must be used within a SettingsProvider");
	return context;
};
