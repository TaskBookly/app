import { useState, useEffect, useCallback } from "react";
import { Container, ContainerGroup, type SelectionMenuOption, type SelectionMenuValueOption, Hint } from "../core";
import Tabs, { type Tab } from "../Tabs";
import InfoConfig, { SwitchConfig, ButtonActionConfig, SelectionMenuConfig, PicturePickerConfig } from "../config";
import { useSettings } from "../SettingsContext";
import { faAnglesRight, faBell, faBolt, faBug, faFolderOpen, faGears, faInfoCircle, faLayerGroup, faLightbulb, faLink, faTimeline } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { usePopup } from "../PopupProvider";

const Settings = () => {
	const { setSetting, getSetting, setSettingsState, defaultSettings } = useSettings();
	const [appVersion, setAppVersion] = useState<string>("Loading...");
	const [nodeEnv, setNodeEnv] = useState<string>("Loading...");
	const [platform, setPlatform] = useState<NodeJS.Platform | null>(null);
	const [electronVersion, setElectronVersion] = useState<string>("Loading...");
	const [chromeVersion, setChromeVersion] = useState<string>("Loading...");
	const { confirm } = usePopup();

	const handleResetSettings = useCallback(async () => {
		const confirmed = await confirm({
			title: "Reset all settings to default?",
			message: (
				<>
					<p>Restoring defaults will overwrite your current TaskBookly configuration. This will not override any custom focus presets.</p>
					<p>Are you sure you want to do this?</p>
				</>
			),
			confirmLabel: "Reset settings",
			cancelLabel: "Keep current",
			intent: "danger",
		});
		if (!confirmed) return;
		try {
			setSettingsState(defaultSettings);
			if (typeof window !== "undefined" && window.electron) {
				for (const setting of defaultSettings) {
					window.electron.settings.set(setting.key, setting.value);
				}
			}
		} catch (error) {
			console.error("Failed to reset settings:", error);
		}
	}, [confirm, setSettingsState, defaultSettings]);

	const handleOpenSettingsDirectory = useCallback(() => {
		if (window.electron?.openUserData) {
			window.electron.openUserData();
		}
	}, []);

	useEffect(() => {
		Promise.all([window.electron.build.getVersion(), window.electron.build.getNodeEnv(), window.electron.build.getPlatform()])
			.then(([version, env, platform]) => {
				setAppVersion(version);
				setNodeEnv(env);
				setPlatform(platform);
			})
			.catch((error) => {
				console.error("Failed to get app info:", error);
				setAppVersion("Unknown");
				setNodeEnv("Unknown");
			});
	}, []);

	useEffect(() => {
		(async () => {
			try {
				const [elec, chrome] = await Promise.all([window.electron.build.getElectronVersion(), window.electron.build.getChromeVersion()]);
				setElectronVersion(elec);
				setChromeVersion(chrome);
			} catch (err) {
				console.debug("Extended app info not available:", err);
				setElectronVersion("Unknown");
				setChromeVersion("Unknown");
			}
		})();
	}, []);

	const themeOptions: SelectionMenuValueOption[] = [
		{ label: "System", value: "system" },
		{ label: "Bookly Light", value: "light" },
		{ label: "Bookly Dark", value: "dark" },
		{ label: "Autumn Spice", value: "autumnSpice" },
		{ label: "Catppuccin", value: "catppuccin" },
		{ label: "Midnight Ocean", value: "midnightOcean" },
		{ label: "Strawberry Splash", value: "strawberrySplash" },
		{ label: "Forest Glass", value: "forestGlass" },
		{ label: "Lavender Mist", value: "lavenderMist" },
		{ label: "Retro Console", value: "retroConsole" },
		{ label: "Monochrome Ink", value: "monochromeInk" },
	];

	const notifOptions: SelectionMenuOption[] = [
		{ label: "None", value: "none" },
		{ label: "Sound Only", value: "soundOnly" },
		{ label: "Notifications & Sound", value: "all" },
	];

	const selectableNotifOptions = notifOptions.filter((option): option is Extract<SelectionMenuOption, { value: string }> => option.type !== "separator");
	const focusTimerOptions = selectableNotifOptions.filter((option) => option.value !== "none");

	const focusSessionTransitionDurationOptions: SelectionMenuOption[] = [
		{ label: "30 seconds", value: "0.5" },
		{ label: "1 minute", value: "1" },
		{ label: "2 minutes", value: "2" },
		{ label: "3 minutes", value: "3" },
		{ label: "4 minutes", value: "4" },
		{ label: "5 minutes", value: "5" },
	];

	const breakChargeExtensionAmountOptions: SelectionMenuOption[] = [
		{ label: "5 minutes", value: "5" },
		{ label: "10 minutes", value: "10" },
		{ label: "15 minutes", value: "15" },
	];

	const breakChargeCooldownOptions: SelectionMenuOption[] = [
		{ label: "No cooldown", value: "0" },
		{ label: "1 break", value: "1" },
		{ label: "2 breaks", value: "2" },
		{ label: "3 breaks", value: "3" },
		{ label: "4 breaks", value: "4" },
		{ label: "5 breaks", value: "5" },
	];

	const workTimePerChargeOptions: SelectionMenuOption[] = [
		{ label: "40 minutes", value: "40" },
		{ label: "1 hour", value: "60" },
		{ label: "1.5 hours", value: "90" },
		{ label: "2 hours", value: "120" },
	];

	const tabs: Tab[] = [
		{
			label: "General",
			key: "general",
			icon: faGears,
			content: (
				<>
					<Container name="settings_general_theme">
						<ContainerGroup>
							<PicturePickerConfig
								name="Theme"
								description="The theme that will be displayed across the app. New themes are added occasionally!"
								menu={{
									options: themeOptions.map((o) => ({
										...o,
										previewRenderer: (vars: Record<string, string>) => (
											<div>
												<div style={{ position: "absolute", width: "0px", display: "flex", flexDirection: "column", padding: "15px 4px", gap: "3px" }}>
													<div style={{ width: "12px", height: "12px", background: vars["--clr-surface-a20"], borderRadius: "0.25em" }} />
													<div style={{ width: "12px", height: "12px", background: vars["--clr-primary-a10"], borderRadius: "0.25em" }} />
												</div>
												<div style={{ background: vars["--clr-surface-a10"], paddingLeft: "20px", paddingTop: "10px" }}>
													<div style={{ maxWidth: "100%", height: "100%", background: vars["--clr-surface-a0"], borderTopLeftRadius: "0.5em", padding: "10px" }}>
														<div style={{ width: "100%", height: "50px", background: vars["--clr-surface-a10"], borderRadius: "0.5em" }} />
													</div>
												</div>
											</div>
										),
									})),
								}}
								value={getSetting("theme")}
								onChange={(v) => setSetting("theme", v)}
							/>
						</ContainerGroup>
					</Container>
					<Container name="settings_general_misc" header={{ title: "Connections", icon: faLink }}>
						<SwitchConfig name="Discord Rich Presence" description={"If enabled, focus activity will be shared to your Discord client and displayed under your profile while a focus session is running.\nShare my activity must be enabled in Discord Settings > Activity Privacy for this to work."} value={getSetting("discordRichPresence") === "true"} onChange={() => setSetting("discordRichPresence", getSetting("discordRichPresence") === "true" ? "false" : "true")} />
					</Container>
					<Container name="settings_general_reset">
						<ContainerGroup>
							<ButtonActionConfig name="Reset all settings to default" description="Restore TaskBookly to its default preferences." button={{ text: "Reset settings" }} onClick={handleResetSettings} />
						</ContainerGroup>
					</Container>
				</>
			),
		},
		{
			label: "Focus",
			key: "focus",
			icon: faLightbulb,
			content: (
				<>
					<Container name="settings_focus_durations" header={{ title: "Period Lengths", icon: faTimeline }}>
						<ContainerGroup>
							<Hint type="info" label="Work and break durations are now managed through Focus presets." />
						</ContainerGroup>
					</Container>

					<Container name="settings_focus_transition" header={{ title: "Transition Periods", icon: faAnglesRight }}>
						<ContainerGroup>
							<SwitchConfig name="Enable transition periods" description="Add a brief pause between work and break periods to save your work, stretch, or mentally prepare for the next session." value={getSetting("transitionPeriodsEnabled") === "true"} onChange={() => setSetting("transitionPeriodsEnabled", getSetting("transitionPeriodsEnabled") === "true" ? "false" : "true")} />
						</ContainerGroup>
						{getSetting("transitionPeriodsEnabled") === "true" ? (
							<ContainerGroup>
								<SelectionMenuConfig name="Transition period duration" menu={{ options: focusSessionTransitionDurationOptions }} value={getSetting("transitionPeriodDuration")} onChange={(v) => setSetting("transitionPeriodDuration", v)} />
							</ContainerGroup>
						) : null}
					</Container>

					<Container name="settings_focus_breakCharging" header={{ title: "Break Charging", icon: faBolt }}>
						<ContainerGroup>
							<SwitchConfig name="Enable break charging" description="Recieve break charges after a certain amount of work time as reward. These charges can be used once per break and will extend them by a few minutes." value={getSetting("breakChargingEnabled") === "true"} onChange={() => setSetting("breakChargingEnabled", getSetting("breakChargingEnabled") === "true" ? "false" : "true")} />
						</ContainerGroup>
						{getSetting("breakChargingEnabled") === "true" ? (
							<ContainerGroup>
								<SelectionMenuConfig name="Charge extension amount" description="The amount of extended time that will be added to a break when using a charge." menu={{ options: breakChargeExtensionAmountOptions }} value={getSetting("breakChargeExtensionAmount")} onChange={(v) => setSetting("breakChargeExtensionAmount", v)} />
								<SelectionMenuConfig name="Charge cooldown time" description="To prevent gathering charges and just using them over and over, a cooldown can be applied that prevents a charge from being able to be used for a certain amount of breaks once one is used." menu={{ options: breakChargeCooldownOptions }} value={getSetting("breakChargeCooldown")} onChange={(v) => setSetting("breakChargeCooldown", v)} />
								<SelectionMenuConfig name="Work time per charge" description="The amount of work time needed to earn a break charge." menu={{ options: workTimePerChargeOptions }} value={getSetting("workTimePerCharge")} onChange={(v) => setSetting("workTimePerCharge", v)} />
							</ContainerGroup>
						) : null}
					</Container>
				</>
			),
		},
		{
			label: "Notifications",
			key: "notifs",
			icon: faBell,
			content: (
				<>
					<Container name="settings_notifs">
						<ContainerGroup>
							<Hint type="warning" label="Make sure to go to your system settings and grant TaskBookly highest priority for notifications or they may be silenced while you're on Do Not Disturb! (Sound will still play)"></Hint>
							<SelectionMenuConfig name="Focus timers" description="Period completions" menu={{ options: focusTimerOptions }} value={getSetting("notifsFocus")} onChange={(v) => setSetting("notifsFocus", v)} />
						</ContainerGroup>
					</Container>
				</>
			),
		},
		{
			label: "About",
			key: "appDetails",
			icon: faInfoCircle,
			content: (
				<>
					<Container name="settings_about_appPackage">
						<ContainerGroup>
							<InfoConfig name="Version" data={appVersion} copyButton />
							<ButtonActionConfig name="User Data" button={{ text: "Open Folder", icon: faFolderOpen }} onClick={handleOpenSettingsDirectory} />
						</ContainerGroup>
					</Container>
					<Container name="settings_about_appAboutMisc">
						<ContainerGroup>
							<InfoConfig name="Environment" data={nodeEnv} copyButton />
							<InfoConfig name="Platform" data={platform ? platform.toString() : "Unknown"} copyButton />
							<InfoConfig name="Electron Version" data={electronVersion} copyButton />
							<InfoConfig name="Chromium Version" data={chromeVersion} copyButton />
						</ContainerGroup>
					</Container>
					<Container name="settings_about_info">
						<ButtonActionConfig name="" description={"This software is licensed under the MIT License.\n\nThis license, plus acknowledgments and the security policy can be found on the TaskBookly GitHub repository.\n\nMade with ❤️ by CodeDevelops"} button={{ icon: faGithub, text: "View on GitHub" }} onClick={() => window.electron.openShellURL("https://github.com/Taskbookly/app")} />
					</Container>
				</>
			),
		},
		...(nodeEnv === "development"
			? [
					{
						label: "Debug",
						key: "debug",
						icon: faBug,
						content: (
							<>
								<Container name="settings_debug_hintComponents" header={{ title: "Hint Components", icon: faLayerGroup }}>
									<Hint type="info" label="Info type" />
									<Hint type="warning" label="Warning type" />
									<Hint type="error" label="Error type" />
									<Hint type="success" label="Success type" />
									<Hint type="processing" label="Processing type" />
								</Container>
							</>
						),
					},
			  ]
			: []),
	];

	return <Tabs tabs={tabs} />;
};

export default Settings;
