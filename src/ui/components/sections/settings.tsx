import React, { useState, useEffect } from "react";
import { Container, type SelectionMenuOption, Hint } from "../core";
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

	const tabs: Tab[] = [
		{
			label: "General",
			key: "general",
			icon: "settings",
			content: (
				<>
					<Container name="settings_general">
						<div>
							<SwitchConfig name="Launch upon login" description="We'll open TaskBookly for you and minimize it upon logging in so it's out of your way." availableOn={["windows", "linux"]} value={getSetting("launchOnLogin") === "true"} onChange={() => setSetting("launchOnLogin", getSetting("launchOnLogin") === "true" ? "false" : "true")} />
							<SwitchConfig name="Check for updates automatically" description="TaskBookly will check for new releases occasionally and notify you if any are found. You must be connected to the internet for this feature to work." value={getSetting("autoCheckForUpdates") === "true"} onChange={() => setSetting("autoCheckForUpdates", getSetting("autoCheckForUpdates") === "true" ? "false" : "true")} />
							<SelectionMenuConfig name="Theme" description="The theme that should be displayed across TaskBookly." menu={{ options: themeOptions }} value={getSetting("theme")} onChange={(v) => setSetting("theme", v)} />
						</div>
					</Container>
					<Container name="settings_focus" header={{ title: "Focus", icon: "timer" }}>
						{(() => {
							const workDuration = parseInt(getSetting("workPeriodDuration")) || 25;
							const breakDuration = parseInt(getSetting("breakPeriodDuration")) || 5;
							const ratio = breakDuration / workDuration;

							// Show warning if ratio is too low (≤ 0.17) OR too high (≥ 0.8)
							if (ratio <= 0.17) {
								return <Hint type="warning" label="Your breaks may be too short for sustained focus. Consider longer breaks." />;
							}
							if (ratio >= 0.75) {
								return <Hint type="warning" label="Your breaks are unusually long compared to work time. Consider adjusting the balance." />;
							}
							return null;
						})()}

						<div>
							<SwitchConfig name="Transition periods" description="Add a brief pause between work and break periods to save your work, stretch, or mentally prepare for the next session." value={getSetting("transitionPeriodsEnabled") === "true"} onChange={() => setSetting("transitionPeriodsEnabled", getSetting("transitionPeriodsEnabled") === "true" ? "false" : "true")} />
							<SelectionMenuConfig name="Work period duration" menu={{ options: focusSessionWorkDurationOptions }} value={getSetting("workPeriodDuration")} onChange={(v) => setSetting("workPeriodDuration", v)} />
							<SelectionMenuConfig name="Break period duration" menu={{ options: focusSessionBreakDurationOptions }} value={getSetting("breakPeriodDuration")} onChange={(v) => setSetting("breakPeriodDuration", v)} />

							{getSetting("transitionPeriodsEnabled") === "true" ? <SelectionMenuConfig name="Transition period duration" menu={{ options: focusSessionTransitionDurationOptions }} value={getSetting("transitionPeriodDuration")} onChange={(v) => setSetting("transitionPeriodDuration", v)} /> : null}
						</div>
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
						<div>
							<SelectionMenuConfig name="Focus timers" menu={{ options: notifOptions.filter((option) => option.value !== "none") }} value={getSetting("notifs:focus")} onChange={(v) => setSetting("notifs:focus", v)} />
							<SelectionMenuConfig name="Task deadlines" menu={{ options: notifOptions }} value={getSetting("notifs:tasks")} onChange={(v) => setSetting("notifs:tasks", v)} />
						</div>
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
						<div>
							<SwitchConfig name="Touch Bar" description="Enabling this feature will display quick actions and info on your Mac's Touch Bar when available." value={getSetting("touchBar") === "true"} onChange={() => setSetting("touchBar", getSetting("touchBar") === "true" ? "false" : "true")} availableOn={["mac"]} />
						</div>
					</Container>
					<Container name="settings_reset">
						<div>
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
						</div>
					</Container>
				</>
			),
		},
		{
			label: "Client",
			key: "client",
			icon: "monitor",
			content: (
				<>
					<Container name="settings_clientData">
						<div>
							<InfoConfig name="Version" data={appVersion} copyButton />
							<InfoConfig name="Node environment" data={nodeEnv} copyButton />
							<InfoConfig name="Platform" data={platform ? platform.toString() : "Unknown"} copyButton />
						</div>
					</Container>
				</>
			),
		},
	];

	return <Tabs tabs={tabs} />;
};

export default Settings;
