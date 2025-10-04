export const DEFAULT_SETTINGS_CONFIG = {
	notifsFocus: "all",
	theme: "system",
	autoCheckForUpdates: "true",
	transitionPeriodsEnabled: "false",
	breakChargingEnabled: "true",
	workPeriodDuration: "25",
	breakPeriodDuration: "10",
	transitionPeriodDuration: "3",
	breakChargeExtensionAmount: "10",
	breakChargeCooldown: "0",
	workTimePerCharge: "60",
};

export const PLATFORM_SPECIFIC_SETTINGS = {
	win32: {},
	darwin: {
		touchBar: "true",
	},
};

export const getDefaultSettings = (platform: string): Record<string, string> => {
	const defaults = { ...DEFAULT_SETTINGS_CONFIG };

	if (platform === "win32" && PLATFORM_SPECIFIC_SETTINGS.win32) {
		Object.assign(defaults, PLATFORM_SPECIFIC_SETTINGS.win32);
	}
	if (platform === "darwin" && PLATFORM_SPECIFIC_SETTINGS.darwin) {
		Object.assign(defaults, PLATFORM_SPECIFIC_SETTINGS.darwin);
	}

	return defaults;
};
