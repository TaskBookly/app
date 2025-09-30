import React, { useState, useEffect } from "react";
import { Container, ContainerGroup, type SelectionMenuOption, Hint } from "../core";
import Tabs, { type Tab } from "../Tabs";
import InfoConfig, { SwitchConfig, ButtonActionConfig, SelectionMenuConfig, ActionMenuConfig } from "../config";
import { useSettings } from "../SettingsContext";
import { faBell, faBolt, faFolderOpen, faGears, faHardDrive, faInfoCircle, faLightbulb, faTimeline } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

const Settings: React.FC = () => {
	const { setSetting, getSetting, setSettingsState, defaultSettings } = useSettings();
	const [appVersion, setAppVersion] = useState<string>("Loading...");
	const [nodeEnv, setNodeEnv] = useState<string>("Loading...");
	const [platform, setPlatform] = useState<NodeJS.Platform | null>(null);
	const [electronVersion, setElectronVersion] = useState<string>("Loading...");
	const [chromeVersion, setChromeVersion] = useState<string>("Loading...");

	const handleOpenSettingsDirectory = () => {
		if (window.electron?.openUserData) {
			window.electron.openUserData();
		}
	};

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

	const themeOptions: SelectionMenuOption[] = [
		{ label: "System", value: "system" },
		{ label: "Light", value: "light" },
		{ label: "Dark", value: "dark" },
		{ label: "Autumn Spice", subLabel: "NEW!", value: "autumnSpice" },

		{ label: "Catppuccin", value: "catppuccin" },
	];

	const notifOptions: SelectionMenuOption[] = [
		{ label: "None", value: "none" },
		{ label: "Sound Only", value: "soundOnly" },
		{ label: "Notifications Only", value: "notifsOnly" },
		{ label: "Notifications & Sound", value: "all" },
	];

	const focusSessionTransitionDurationOptions: SelectionMenuOption[] = [
		{ label: "30 seconds", value: "0.5" },
		{ label: "1 minute", value: "1" },
		{ label: "2 minutes", value: "2" },
		{ label: "3 minutes", value: "3" },
		{ label: "4 minutes", value: "4" },
		{ label: "5 minutes", value: "5" },
	];

	const focusSessionWorkDurationOptions: SelectionMenuOption[] = [
		{ label: "20 minutes", value: "20" },
		{ label: "25 minutes", value: "25" },
		{ label: "30 minutes", value: "30" },
		{ label: "35 minutes", value: "35" },
		{ label: "40 minutes", value: "40" },
	];

	const focusSessionBreakDurationOptions: SelectionMenuOption[] = [
		{ label: "5 minutes", value: "5" },
		{ label: "10 minutes", value: "10" },
		{ label: "15 minutes", value: "15" },
		{ label: "20 minutes", value: "20" },
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
					<Container name="settings_general_software" header={{ title: "Software", icon: faHardDrive }}>
						<ContainerGroup>
							<SwitchConfig name="Check for updates automatically" description="TaskBookly will check for new releases occasionally and notify you if any are found. You must be connected to the internet for this feature to work." value={getSetting("autoCheckForUpdates") === "true"} onChange={() => setSetting("autoCheckForUpdates", getSetting("autoCheckForUpdates") === "true" ? "false" : "true")} />
						</ContainerGroup>
					</Container>
					<Container name="settings_general_misc">
						<SelectionMenuConfig name="Theme" description="The theme that will be displayed across the app. New themes are added occasionally!" menu={{ options: themeOptions }} value={getSetting("theme")} onChange={(v) => setSetting("theme", v)} />
						<SwitchConfig name="Touch Bar" description="Enabling this feature will display quick actions and info on your Mac's Touch Bar, when available." value={getSetting("touchBar") === "true"} onChange={() => setSetting("touchBar", getSetting("touchBar") === "true" ? "false" : "true")} availableOn={["mac"]} />
					</Container>
					<Container name="settings_general_reset">
						<ContainerGroup>
							<ActionMenuConfig
								name="Reset all settings to default"
								menu={{
									button: { text: "Reset" },
									options: [
										{
											label: "Confirm?",
											value: "confirm",
											onClick: () => {
												try {
													setSettingsState(defaultSettings);
													if (typeof window !== "undefined" && window.electron) {
														for (const setting of defaultSettings) {
															window.electron.settings.set(setting.key, setting.value);
														}
													}
												} catch {}
											},
										},
									],
								}}
							/>
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
					<Container name="settings_focus_features">
						<ContainerGroup>
							<SwitchConfig name="Transition periods" description="Add a brief pause between work and break periods to save your work, stretch, or mentally prepare for the next session." value={getSetting("transitionPeriodsEnabled") === "true"} onChange={() => setSetting("transitionPeriodsEnabled", getSetting("transitionPeriodsEnabled") === "true" ? "false" : "true")} />
							<SwitchConfig name="Break charging" description="Recieve break charges after a certain amount of work time as reward. These charges can be used once per break and extend them by a few minutes." value={getSetting("breakChargingEnabled") === "true"} onChange={() => setSetting("breakChargingEnabled", getSetting("breakChargingEnabled") === "true" ? "false" : "true")} />
						</ContainerGroup>
					</Container>
					<Container name="settings_focus_durations" header={{ title: "Period Lengths", icon: faTimeline }}>
						<ContainerGroup>
							{(() => {
								const workDuration = parseInt(getSetting("workPeriodDuration"));
								const breakDuration = parseInt(getSetting("breakPeriodDuration"));
								const ratio = breakDuration / workDuration;

								if (ratio <= 0.17) {
									return <Hint type="warning" label="Your breaks may be too short for sustained focus. Consider longer breaks." />;
								}
								if (ratio >= 0.75) {
									return <Hint type="warning" label="Your breaks are unusually long compared to work time. Consider adjusting the balance." />;
								}
								return null;
							})()}
							<SelectionMenuConfig name="Work period duration" menu={{ options: focusSessionWorkDurationOptions }} value={getSetting("workPeriodDuration")} onChange={(v) => setSetting("workPeriodDuration", v)} />
							<SelectionMenuConfig name="Break period duration" menu={{ options: focusSessionBreakDurationOptions }} value={getSetting("breakPeriodDuration")} onChange={(v) => setSetting("breakPeriodDuration", v)} />
							{getSetting("transitionPeriodsEnabled") === "true" ? <SelectionMenuConfig name="Transition period duration" menu={{ options: focusSessionTransitionDurationOptions }} value={getSetting("transitionPeriodDuration")} onChange={(v) => setSetting("transitionPeriodDuration", v)} /> : null}
						</ContainerGroup>
					</Container>
					{getSetting("breakChargingEnabled") === "true" ? (
						<Container name="settings_focus_breakCharging" header={{ title: "Break Charging", icon: faBolt }}>
							<ContainerGroup>
								<SelectionMenuConfig name="Charge extension amount" description="The amount of extended time that will be added to a break when using a charge." menu={{ options: breakChargeExtensionAmountOptions }} value={getSetting("breakChargeExtensionAmount")} onChange={(v) => setSetting("breakChargeExtensionAmount", v)} />
								<SelectionMenuConfig name="Charge cooldown time" description="To prevent gathering charges and just using them over and over, a cooldown can be applied that prevents a charge from being able to be used for a certain amount of breaks once one is used." menu={{ options: breakChargeCooldownOptions }} value={getSetting("breakChargeCooldown")} onChange={(v) => setSetting("breakChargeCooldown", v)} />
								<SelectionMenuConfig name="Work time per charge" description="The amount of work time needed to earn a break charge." menu={{ options: workTimePerChargeOptions }} value={getSetting("workTimePerCharge")} onChange={(v) => setSetting("workTimePerCharge", v)} />
							</ContainerGroup>
						</Container>
					) : null}
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
							<SelectionMenuConfig name="Focus timers" menu={{ options: notifOptions.filter((option) => option.value !== "none") }} value={getSetting("notifsFocus")} onChange={(v) => setSetting("notifsFocus", v)} />
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
						<ButtonActionConfig name="" description={"This software is licensed under the MIT License.\n\nThis license, plus acknowledgements and the security policy can be found on the TaskBookly GitHub repository.\n\nMade with ❤️ by CodeDevelops"} button={{ icon: faGithub, text: "View on GitHub" }} />
					</Container>
				</>
			),
		},
	];

	return <Tabs tabs={tabs} />;
};

export default Settings;
