import React from "react";
import { Container, type SelectionMenuOption, type ActionMenuOption } from "../core";
import Tabs, { type Tab } from "../Tabs";
import InfoConfig, { SwitchConfig, ButtonActionConfig, SelectionMenuConfig, ActionMenuConfig } from "../config";
import { useSettings } from "../SettingsContext";

const Settings: React.FC = () => {
	const { setSetting, getSetting, setSettingsState, defaultSettings } = useSettings();

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

	const wrapUpReminderOptions: SelectionMenuOption[] = [
		{ label: "No reminder", value: "0" },
		{ label: "1 minute before", value: "1" },
		{ label: "2 minutes before", value: "2" },
		{ label: "3 minutes before", value: "3" },
		{ label: "4 minutes before", value: "4" },
		{ label: "5 minutes before", value: "5" },
		{ label: "10 minutes before", value: "10" },
		{ label: "15 minutes before", value: "15" },
		{ label: "20 minutes before", value: "20" },
		{ label: "25 minutes before", value: "25" },
		{ label: "30 minutes before", value: "30" },
	];

	const debugActions: ActionMenuOption[] = [
		{
			label: "Clear local storage",
			value: "clearLocalStorage",
			icon: "delete",
			onClick: () => {
				if (window.confirm("Are you sure you want to clear local storage? This will reset all settings and data.")) {
					localStorage.clear();
					window.location.reload();
				}
			},
		},
		{ label: "Open dev tools", value: "openDevTools", onClick: () => window.open("devtools://devtools/bundled/inspector.html?ws=localhost:9222/devtools/page/1") },
		{ label: "Reload app", value: "reloadApp", icon: "refresh", onClick: () => window.location.reload() },
	];

	const tabs: Tab[] = [
		{
			label: "App",
			key: "app",
			icon: "web_asset",
			content: (
				<Container name="settings_app">
					<ButtonActionConfig name="Software Update" description={`TaskBookly v0.3.0\nLast checked: N/A`} button={{ text: "Check for Updates", icon: "refresh" }} />
					<SwitchConfig name="Launch upon login" description="We'll open TaskBookly for you and minimize it upon logging in so it's out of your way." availableOn={["windows"]} value={getSetting("launchOnLogin") === "true"} onChange={() => setSetting("launchOnLogin", getSetting("launchOnLogin") === "true" ? "false" : "true")} />
					<SwitchConfig name="Auto-update" description="TaskBookly will check for updates and attempt to apply them when launching the app." value={getSetting("autoUpdate") === "true"} onChange={() => setSetting("autoUpdate", getSetting("autoUpdate") === "true" ? "false" : "true")} />
					<SelectionMenuConfig name="Theme" description="The theme that should be displayed across TaskBookly." menu={{ options: themeOptions }} value={getSetting("theme")} onChange={(v) => setSetting("theme", v)} />
				</Container>
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
					<Container name="settings_notifs_focus" header={{ title: "Focus timer", icon: "timer" }}>
						<SelectionMenuConfig name="Wrap-up reminder" description="Choose how many minutes before the end of a focus timer you'd like to receive a reminder, so you have time to wrap things up." menu={{ options: wrapUpReminderOptions }} value={getSetting("wrapupReminder")} onChange={(v) => setSetting("wrapupReminder", v)} />
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
											setSettingsState(defaultSettings);
											if (typeof window !== undefined) {
												localStorage.setItem("settings", JSON.stringify(defaultSettings));
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
					<Container name="settings_debugActions">
						<ActionMenuConfig name="Debug actions" menu={{ button: { text: "Open debug actions", icon: "bug_report" }, options: debugActions }} />
					</Container>
					<Container name="settings_clientData">
						<InfoConfig name="Version" data="v0.3.0" />
						<InfoConfig name="Node environment" data="development" copyButton />
					</Container>
				</>
			),
		},
	];

	return <Tabs tabs={tabs} />;
};

export default Settings;
