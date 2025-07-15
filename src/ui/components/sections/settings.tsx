import React, { useState, useEffect } from "react";
import { Container, ContainerGroup, type SelectionMenuOption, Hint } from "../core";
import Tabs, { type Tab } from "../Tabs";
import InfoConfig, { SwitchConfig, ButtonActionConfig, SelectionMenuConfig, ActionMenuConfig } from "../config";
import { useSettings } from "../SettingsContext";

const Settings: React.FC = () => {
	const { setSetting, getSetting, setSettingsState, defaultSettings } = useSettings();
	const [appVersion, setAppVersion] = useState<string>("Loading...");
	const [nodeEnv, setNodeEnv] = useState<string>("Loading...");
	const [platform, setPlatform] = useState<NodeJS.Platform | null>(null);

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

	const themeOptions: SelectionMenuOption[] = [
		{ label: "Light", value: "light" },
		{ label: "Dark", value: "dark" },
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
			icon: "settings",
			content: (
				<>
					<Container name="settings_general">
						<ContainerGroup>
							<SwitchConfig name="Launch upon login" description="We'll open TaskBookly for you and minimize it upon logging in so it's out of your way." availableOn={["windows"]} value={getSetting("launchOnLogin") === "true"} onChange={() => setSetting("launchOnLogin", getSetting("launchOnLogin") === "true" ? "false" : "true")} />
							<SwitchConfig name="Check for updates automatically" description="TaskBookly will check for new releases occasionally and notify you if any are found. You must be connected to the internet for this feature to work." value={getSetting("autoCheckForUpdates") === "true"} onChange={() => setSetting("autoCheckForUpdates", getSetting("autoCheckForUpdates") === "true" ? "false" : "true")} />
							<SelectionMenuConfig name="Theme" description="The theme that should be displayed across TaskBookly." menu={{ options: themeOptions }} value={getSetting("theme")} onChange={(v) => setSetting("theme", v)} />
						</ContainerGroup>
					</Container>
					<Container name="settings_focus" header={{ title: "Focus", icon: "timer" }}>
						<ContainerGroup>
							<SwitchConfig name="Transition periods" description="Add a brief pause between work and break periods to save your work, stretch, or mentally prepare for the next session." value={getSetting("transitionPeriodsEnabled") === "true"} onChange={() => setSetting("transitionPeriodsEnabled", getSetting("transitionPeriodsEnabled") === "true" ? "false" : "true")} />
							<SwitchConfig name="Break charging" description="Recieve break charges after a certain amount of work time as reward. These charges can be used once per break and extend them by a few minutes." value={getSetting("breakChargingEnabled") === "true"} onChange={() => setSetting("breakChargingEnabled", getSetting("breakChargingEnabled") === "true" ? "false" : "true")} />
						</ContainerGroup>
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
						{getSetting("breakChargingEnabled") === "true" ? (
							<ContainerGroup>
								<SelectionMenuConfig name="Charge extension amount" description="The amount of time charging breaks extends them by." menu={{ options: breakChargeExtensionAmountOptions }} value={getSetting("breakChargeExtensionAmount")} onChange={(v) => setSetting("breakChargeExtensionAmount", v)} />
								<SelectionMenuConfig name="Charge cooldown time" description="The amount of break sessions needed to pass before another charge can be used." menu={{ options: breakChargeCooldownOptions }} value={getSetting("breakChargeCooldown")} onChange={(v) => setSetting("breakChargeCooldown", v)} />
								<SelectionMenuConfig name="Work time per charge" description="The amount of work time required to earn another break charge." menu={{ options: workTimePerChargeOptions }} value={getSetting("workTimePerCharge")} onChange={(v) => setSetting("workTimePerCharge", v)} />
							</ContainerGroup>
						) : null}
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
						<ContainerGroup>
							<SelectionMenuConfig name="Focus timers" menu={{ options: notifOptions.filter((option) => option.value !== "none") }} value={getSetting("notifsFocus")} onChange={(v) => setSetting("notifsFocus", v)} />
						</ContainerGroup>
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
						<ContainerGroup>
							<SwitchConfig name="Touch Bar" description="Enabling this feature will display quick actions and info on your Mac's Touch Bar when available." value={getSetting("touchBar") === "true"} onChange={() => setSetting("touchBar", getSetting("touchBar") === "true" ? "false" : "true")} availableOn={["mac"]} />
						</ContainerGroup>
					</Container>
					<Container name="settings_reset">
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
			label: "Client",
			key: "client",
			icon: "monitor",
			content: (
				<>
					<Container name="settings_clientData">
						<ContainerGroup>
							<InfoConfig name="Version" data={appVersion} copyButton />
							<InfoConfig name="Node environment" data={nodeEnv} copyButton />
							<InfoConfig name="Platform" data={platform ? platform.toString() : "Unknown"} copyButton />
							<ButtonActionConfig name="UserData" button={{ text: "Open Folder", icon: "folder_open" }} onClick={handleOpenSettingsDirectory} />
						</ContainerGroup>
					</Container>
					<Container name="settings_hintTypes">
						<Hint type="info" label="Info hint type" />
						<Hint type="warning" label="Warning hint type" />
						<Hint type="error" label="Error hint type" />
						<Hint type="success" label="Success hint type" />
						<Hint type="processing" label="Processing hint type" />
					</Container>
					<Container name="settings_configComponents">
						<ContainerGroup>
							<SelectionMenuConfig
								name="SelectionMenuConfig (Empty)"
								menu={{
									options: [],
								}}
								value="_"
							/>
							<SelectionMenuConfig
								name="SelectionMenuConfig"
								menu={{
									options: [
										{ label: "Option 1", value: "_1" },
										{ label: "Option 2", value: "_2" },
										{ label: "Option 3", value: "_3" },
									],
								}}
								value="_1"
							/>
							<SelectionMenuConfig
								name="SelectionMenuConfig (Searchable)"
								menu={{
									options: [
										{ label: "Option 1", value: "_1" },
										{ label: "Option 2", value: "_2" },
										{ label: "Option 3", value: "_3" },
									],
									searchable: true,
								}}
								value="_1"
							/>
							<ActionMenuConfig
								name="ActionMenuConfig (Searchable)"
								menu={{
									button: { text: "Action" },
									options: [
										{
											label: "Option 1",
											value: "option1",
											onClick: () => {},
										},
										{
											label: "Option 2",
											value: "option2",
											onClick: () => {},
										},
										{
											label: "Option 3",
											value: "option3",
											onClick: () => {},
										},
									],
									searchable: true,
								}}
							/>
							<SelectionMenuConfig
								name="SelectionMenuConfig (Disabled)"
								menu={{
									options: [
										{ label: "Option 1", value: "_1" },
										{ label: "Option 2", value: "_2" },
									],
								}}
								value="_1"
								disabled
							/>
							<SwitchConfig name="SwitchConfig (Checked)" value={true} onChange={() => {}} />
							<SwitchConfig name="SwitchConfig (Unchecked)" value={false} onChange={() => {}} />
							<SwitchConfig name="SwitchConfig (Disabled; Checked)" value={true} onChange={() => {}} disabled />
							<SwitchConfig name="SwitchConfig (Disabled; Unchecked)" value={false} onChange={() => {}} disabled />
							<ActionMenuConfig
								name="ActionMenuConfig"
								menu={{
									button: { text: "Action" },
									options: [
										{
											label: "Option 1",
											value: "option1",
											icon: "star",
											onClick: () => {},
										},
										{
											label: "Option 2",
											value: "option2",
											icon: "edit",
											onClick: () => {},
										},
										{
											label: "Option 3",
											value: "option3",
											icon: "delete",
											onClick: () => {},
										},
										{
											label: "Option 4",
											value: "option4",
											icon: "info",
											onClick: () => {},
										},
									],
								}}
							/>
							<ActionMenuConfig
								name="ActionMenuConfig (Disabled)"
								menu={{
									button: { text: "Action" },
									options: [
										{
											label: "Option 1",
											value: "option1",
											onClick: () => {},
										},
									],
								}}
								disabled
							/>
							<InfoConfig name="InfoConfig" data="Key/value pair" copyButton />
							<InfoConfig name="InfoConfig (No Copy)" data="Key/value pair (No copy)" />
						</ContainerGroup>
					</Container>
				</>
			),
		},
	];

	return <Tabs tabs={tabs} />;
};

export default Settings;
