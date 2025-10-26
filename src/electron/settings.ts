export const DEFAULT_SETTINGS_CONFIG = {
	notifsFocus: "all",
	theme: "system",
	discordRichPresence: "true",
	transitionPeriodsEnabled: "false",
	breakChargingEnabled: "true",
	workPeriodDuration: "25",
	breakPeriodDuration: "10",
	transitionPeriodDuration: "3",
	breakChargeExtensionAmount: "10",
	breakChargeCooldown: "0",
	workTimePerCharge: "60",
};

export const PLATFORM_SPECIFIC_DEFAULTS = {
	win32: {},
	darwin: {},
};

export const getDefaultSettings = (platform: string): Record<string, string> => {
	const defaults = { ...DEFAULT_SETTINGS_CONFIG };

	if (platform === "win32" && PLATFORM_SPECIFIC_DEFAULTS.win32) {
		Object.assign(defaults, PLATFORM_SPECIFIC_DEFAULTS.win32);
	}
	if (platform === "darwin" && PLATFORM_SPECIFIC_DEFAULTS.darwin) {
		Object.assign(defaults, PLATFORM_SPECIFIC_DEFAULTS.darwin);
	}

	return defaults;
};
