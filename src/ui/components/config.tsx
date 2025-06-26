import React from "react";
import IcoButton, { type SelectionMenuOption, type ActionMenuOption, SelectionMenu, ActionMenu } from "./core";

// Platform type for availableOn
export type Platform = "windows" | "mac" | "linux" | "all";

export function getPlatform(): Platform {
	const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
	if (ua.includes("win")) return "windows";
	if (ua.includes("mac")) return "mac";
	if (ua.includes("linux")) return "linux";
	return "windows"; // fallback
}

interface InfoProps {
	name: string;
	data: string | number | boolean;
	copyButton?: boolean;
	availableOn?: Platform[];
	hint?: {
		type: "info" | "warning" | "error" | "success" | "processing";
		label: string;
	};
	children?: React.ReactNode;
}

interface ConfigDefaults {
	name: string;
	description?: string;
	disabled?: boolean;
	availableOn?: Platform[];
	hint?: {
		type: "info" | "warning" | "error" | "success" | "processing";
		label: string;
	};
	children?: React.ReactNode;
}

interface SwitchProps extends ConfigDefaults {
	value: boolean;
	onChange?: () => void;
}

interface ButtonActionProps extends ConfigDefaults {
	onClick?: () => void;
	button: {
		text?: string;
		icon?: string;
		tooltip?: string;
	};
}

interface SelectionMenuProps extends ConfigDefaults {
	value: string;
	onChange?: (value: string) => void;
	menu: {
		options: SelectionMenuOption[];
		searchable?: boolean;
		placeholderText?: string;
		className?: string;
	};
}

interface ActionMenuProps extends ConfigDefaults {
	menu: {
		button: {
			text?: string;
			icon?: string;
			tooltip?: string;
		};
		options: ActionMenuOption[];
		searchable?: boolean;
		className?: string;
	};
}

const Hint: React.FC<{ type: "info" | "warning" | "error" | "success" | "processing"; label: string }> = ({ type, label }) => {
	return (
		<div className={`settingHint settingHint-${type}`}>
			<span className="hintIcon material-symbols-rounded">{type === "info" ? "info" : type === "warning" ? "warning" : type === "error" ? "error" : type === "success" ? "check_circle" : type === "processing" ? "progress_activity" : "info"}</span>
			<span className="hintLabel">{label}</span>
		</div>
	);
};

const InfoConfig: React.FC<InfoProps> = ({ name, data, copyButton = false, hint, availableOn = ["all"], children }) => {
	const platform = getPlatform();
	if (availableOn && !availableOn.includes("all") && !availableOn.includes(platform)) return null;

	return copyButton ? (
		<ButtonActionConfig name={name} description={data.toString()} button={{ icon: "content_copy", tooltip: "Copy value" }} onClick={() => navigator.clipboard.writeText(data.toString())}>
			{children}
		</ButtonActionConfig>
	) : (
		<div data-settingtype="info" className="setting">
			<div className="settingContent">
				<span className="settingInfo">
					<label className="settingLabel">{name}</label>
					<p className="settingDesc">{data}</p>
				</span>
			</div>

			{hint ? <Hint type={hint.type} label={hint.label} /> : null}
			{children}
		</div>
	);
};

const SwitchConfig: React.FC<SwitchProps> = ({ name, description, disabled = false, hint, value, onChange = () => {}, availableOn = ["all"], children }) => {
	const platform = getPlatform();
	if (availableOn && !availableOn.includes("all") && !availableOn.includes(platform)) return null;

	return (
		<div data-settingtype="switch" className="setting">
			<div className="settingContent">
				<span className="settingInfo">
					<label className="settingLabel">{name}</label>
					<p className="settingDesc">{description}</p>
				</span>
				<span className="settingInput">
					<input disabled={disabled} checked={value} type="checkbox" className="switchInput" onChange={onChange} />
				</span>
			</div>

			{hint ? <Hint type={hint.type} label={hint.label} /> : null}
			{children}
		</div>
	);
};

const ButtonActionConfig: React.FC<ButtonActionProps> = ({ name, description, disabled = false, button, hint, onClick = () => {}, availableOn = ["all"], children }) => {
	const platform = getPlatform();
	if (availableOn && !availableOn.includes("all") && !availableOn.includes(platform)) return null;

	return (
		<div data-settingtype="actionButton" className="setting">
			<div className="settingContent">
				<span className="settingInfo">
					<label className="settingLabel">{name}</label>
					<p className="settingDesc">{description}</p>
				</span>
				<span className="settingInput">
					<IcoButton text={button.text} icon={button.icon} disabled={disabled} tooltip={button.tooltip} onClick={{ action: onClick }} />
				</span>
			</div>

			{hint ? <Hint type={hint.type} label={hint.label} /> : null}
			{children}
		</div>
	);
};

const SelectionMenuConfig: React.FC<SelectionMenuProps> = ({ name, description, menu, value, onChange = () => {}, disabled = false, hint, availableOn = ["all"], children }) => {
	const platform = getPlatform();
	if (availableOn && !availableOn.includes("all") && !availableOn.includes(platform)) return null;

	return (
		<div data-settingtype="actionButton" className="setting">
			<div className="settingContent">
				<span className="settingInfo">
					<label className="settingLabel">{name}</label>
					<p className="settingDesc">{description}</p>
				</span>
				<span className="settingInput">
					<SelectionMenu options={menu.options} value={value} onChange={onChange} disabled={disabled} searchable={menu.searchable} placeholder={menu.placeholderText} className={menu.className} />
				</span>
			</div>

			{hint ? <Hint type={hint.type} label={hint.label} /> : null}
			{children}
		</div>
	);
};

const ActionMenuConfig: React.FC<ActionMenuProps> = ({ name, description, menu, disabled = false, hint, availableOn = ["all"], children }) => {
	const platform = getPlatform();
	if (availableOn && !availableOn.includes("all") && !availableOn.includes(platform)) return null;

	return (
		<div data-settingtype="actionButton" className="setting">
			<div className="settingContent">
				<span className="settingInfo">
					<label className="settingLabel">{name}</label>
					<p className="settingDesc">{description}</p>
				</span>
				<span className="settingInput">
					<ActionMenu button={<IcoButton text={menu.button.text} icon={menu.button.icon} disabled={disabled} tooltip={menu.button.tooltip} />} options={menu.options} searchable={menu.searchable} className={menu.className} />
				</span>
			</div>

			{hint ? <Hint type={hint.type} label={hint.label} /> : null}
			{children}
		</div>
	);
};

export { SwitchConfig, ButtonActionConfig, SelectionMenuConfig, ActionMenuConfig };
export default InfoConfig;
