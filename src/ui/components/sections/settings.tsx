import React, { useState, useEffect } from "react";
import { Container, type SelectionMenuOption } from "../core";
import Tabs, { type Tab } from "../Tabs";
import InfoConfig, { SwitchConfig, SelectionMenuConfig, ActionMenuConfig } from "../config";
import { useSettings } from "../SettingsContext";

const Settings: React.FC = () => {
	const { setSetting, getSetting, setSettingsState, defaultSettings } = useSettings();
	const [appVersion, setAppVersion] = useState<string>("Loading...");
	const [nodeEnv, setNodeEnv] = useState<string>("Loading...");
	const [platform, setPlatform] = useState<NodeJS.Platform | null>(null);

	useEffect(() => {
		// Fetch app version and node environment from electron
		Promise.all([window.electron.build.getVersion(), window.electron.build.getNodeEnv(), window.electron.build.getPlatform()])
			.then(([version, env, platform]) => {
				setAppVersion(`v${version}`);
				setNodeEnv(env);
				setPlatform(platform);
			})
			.catch((error) => {
				console.error("Failed to get app info:", error);
				setAppVersion("Unknown");
				setNodeEnv("Unknown");
			});
	}, []);

	const themeOptions: SelectionMenuOption[] = [
		{ label: "Light", value: "light" },
		{ label: "Dark", value: "dark" },
		{ label: "Catppuccin", value: "catppuccin" },
		{ label: "Discoo mode!! 🪩🪩🪩", value: "disco" },
	];

	const notifOptions: SelectionMenuOption[] = [
		{ label: "None", value: "none" },
		{ label: "Sound Only", value: "soundOnly" },
		{ label: "Notifications Only", value: "notifsOnly" },
		{ label: "Notifications & Sound", value: "all" },
	];

	const transitionPeriodDurationOptions: SelectionMenuOption[] = [
		{ label: "1 minute", value: "1" },
		{ label: "2 minutes", value: "2" },
		{ label: "3 minutes", value: "3" },
		{ label: "4 minutes", value: "4" },
		{ label: "5 minutes", value: "5" },
	];

	const tabs: Tab[] = [
		{
			label: "General",
			key: "general",
			icon: "settings",
			content: (
				<>
					<Container name="settings_general">
						<SwitchConfig name="Launch upon login" description="We'll open TaskBookly for you and minimize it upon logging in so it's out of your way." availableOn={["windows"]} value={getSetting("launchOnLogin") === "true"} onChange={() => setSetting("launchOnLogin", getSetting("launchOnLogin") === "true" ? "false" : "true")} />
						<SwitchConfig name="Check for updates automatically" description="TaskBookly will check for new releases occasionally and notify you if any are found. You must be connected to the internet for this feature to work." value={getSetting("autoCheckForUpdates") === "true"} onChange={() => setSetting("autoCheckForUpdates", getSetting("autoCheckForUpdates") === "true" ? "false" : "true")} />
						<SelectionMenuConfig name="Theme" description="The theme that should be displayed across TaskBookly." menu={{ options: themeOptions }} value={getSetting("theme")} onChange={(v) => setSetting("theme", v)} />
					</Container>
					<Container name="settings_focus" header={{ title: "Focus", icon: "timer" }}>
						<SwitchConfig name="Transition periods" description="If enabled, we'll add a short period between focus sessions to allow you time to transition to the next focus period." value={getSetting("transitionPeriodsEnabled") === "true"} onChange={() => setSetting("transitionPeriodsEnabled", getSetting("transitionPeriodsEnabled") === "true" ? "false" : "true")} />
						{getSetting("transitionPeriodsEnabled") === "true" ? <SelectionMenuConfig name="Transition period duration" menu={{ options: transitionPeriodDurationOptions }} value={getSetting("transitionPeriodDuration")} onChange={(v) => setSetting("transitionPeriodDuration", v)} /> : null}
					</Container>
				</>
			),
		},
		{
			label: "Notifications",
			key: "notifs",
			icon: "notifications_unread",
			content: (
				<>
					<Container name="settings_notifs">
						<SelectionMenuConfig name="Focus timers" menu={{ options: notifOptions }} value={getSetting("notifs:focus")} onChange={(v) => setSetting("notifs:focus", v)} />
						<SelectionMenuConfig name="Task deadlines" menu={{ options: notifOptions }} value={getSetting("notifs:tasks")} onChange={(v) => setSetting("notifs:tasks", v)} />
					</Container>
				</>
			),
		},
		{
			label: "Misc",
			key: "misc",
			icon: "pending",
			content: (
				<>
					<Container name="settings_misc">
						<SwitchConfig name="Touch Bar" description="Enabling this feature will display quick actions and info on your Mac's Touch Bar when available." value={getSetting("touchBar") === "true"} onChange={() => setSetting("touchBar", getSetting("touchBar") === "true" ? "false" : "true")} availableOn={["mac"]} />
					</Container>
					<Container name="settings_reset">
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
												if (typeof window !== "undefined") {
													localStorage.setItem("settings", JSON.stringify(defaultSettings));
												}
											} catch (error) {
												console.error("Failed to reset settings:", error);
											}
										},
									},
								],
							}}
						/>
					</Container>
				</>
			),
		},
		{
			label: "Debug",
			key: "debug",
			icon: "bug_report",
			content: (
				<>
					<Container name="settings_clientData">
						<InfoConfig name="Version" data={appVersion} copyButton />
						<InfoConfig name="Node environment" data={nodeEnv} copyButton />
						<InfoConfig name="Platform" data={platform ? platform.toString() : "Unknown"} copyButton />
					</Container>
				</>
			),
		},
	];

	return <Tabs tabs={tabs} />;
};

export default Settings;
