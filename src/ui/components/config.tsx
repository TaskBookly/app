import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import IcoButton, { type SelectionMenuOption, type SelectionMenuValueOption, type ActionMenuOption, type HintType, Hint, SelectionMenu, ActionMenu } from "./core";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faCopy } from "@fortawesome/free-solid-svg-icons";

// Platform type for availableOn
export type Platform = "windows" | "mac";

export function getPlatform(): Platform {
	const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
	if (ua.includes("win")) return "windows";
	if (ua.includes("mac")) return "mac";
	return "windows"; // fallback
}

interface InfoProps {
	name: string;
	data: string | number | boolean;
	copyButton?: boolean;
	availableOn?: Platform[];
	hint?: {
		type: HintType;
		label: string;
	};
	children?: ReactNode;
}

interface ConfigDefaults {
	name: string;
	description?: string;
	disabled?: boolean;
	availableOn?: Platform[];
	hint?: {
		type: HintType;
		label: string;
	};
	children?: ReactNode;
}

interface SwitchProps extends ConfigDefaults {
	value: boolean;
	onChange?: () => void;
}

interface ButtonActionProps extends ConfigDefaults {
	onClick?: () => void;
	button: {
		text?: string;
		icon?: IconProp;
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

type PicturePickerOption = SelectionMenuValueOption & {
	previewRenderer: (vars: Record<string, string>) => ReactNode;
};

interface PicturePickerProps extends ConfigDefaults {
	value: string;
	onChange?: (value: string) => void;
	menu: {
		options: PicturePickerOption[];
		rows?: number;
		className?: string;
	};
}

interface ActionMenuProps extends ConfigDefaults {
	menu: {
		button: {
			text?: string;
			icon?: IconProp;
			tooltip?: string;
		};
		options: ActionMenuOption[];
		searchable?: boolean;
		className?: string;
	};
}

const InfoConfig = ({ name, data, copyButton = false, hint, availableOn = ["windows", "mac"], children }: InfoProps) => {
	const platform = getPlatform();
	if (availableOn && !availableOn.includes(platform)) return null;

	return copyButton ? (
		<ButtonActionConfig name={name} description={data.toString()} button={{ icon: faCopy, tooltip: "Copy value" }} onClick={() => navigator.clipboard.writeText(data.toString())}>
			{children}
		</ButtonActionConfig>
	) : (
		<div data-settingtype="info" className="setting">
			<div className="settingContent">
				<span className="settingInfo">
					<h3 className="settingLabel">{name}</h3>
					<p className="settingDesc">{data}</p>
				</span>
			</div>

			{hint ? <Hint type={hint.type} label={hint.label} /> : null}
			{children}
		</div>
	);
};

const SwitchConfig = ({ name, description, disabled = false, hint, value, onChange = () => {}, availableOn = ["windows", "mac"], children }: SwitchProps) => {
	const platform = getPlatform();
	if (availableOn && !availableOn.includes(platform)) return null;

	return (
		<div data-settingtype="switch" className="setting">
			<div className="settingContent">
				<span className="settingInfo">
					<h3 className="settingLabel">{name}</h3>
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

const ButtonActionConfig = ({ name, description, disabled = false, button, hint, onClick = () => {}, availableOn = ["windows", "mac"], children }: ButtonActionProps) => {
	const platform = getPlatform();
	if (availableOn && !availableOn.includes(platform)) return null;

	return (
		<div data-settingtype="actionButton" className="setting">
			<div className="settingContent">
				<span className="settingInfo">
					<h3 className="settingLabel">{name}</h3>
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

const SelectionMenuConfig = ({ name, description, menu, value, onChange = () => {}, disabled = false, hint, availableOn = ["windows", "mac"], children }: SelectionMenuProps) => {
	const platform = getPlatform();
	if (availableOn && !availableOn.includes(platform)) return null;

	return (
		<div data-settingtype="actionButton" className="setting">
			<div className="settingContent">
				<span className="settingInfo">
					<h3 className="settingLabel">{name}</h3>
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

// Lightweight cache to avoid repeated layout reads when rendering many previews
const __themeVarCache: Map<string, Record<string, string>> = new Map();

function detectSystemTheme(): "dark" | "light" {
	if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return "dark";
	return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

// Register a listener that clears the cached 'system' entry and notifies components to re-render
if (typeof window !== "undefined" && typeof window.matchMedia !== "undefined") {
	try {
		const mq = window.matchMedia("(prefers-color-scheme: light)");
		const handler = () => {
			__themeVarCache.delete("system");
			try {
				window.dispatchEvent(new CustomEvent("theme-system-changed"));
			} catch (_error) {
				void _error;
				// Suppress cross-origin access errors that can occur in some browsers.
			}
		};
		if (typeof mq.addEventListener === "function") {
			mq.addEventListener("change", handler);
		} else if (typeof mq.addListener === "function") {
			mq.addListener(handler as Parameters<typeof mq.addListener>[0]);
		}
	} catch (_error) {
		void _error;
		// ignore - non-fatal
	}
}

function readThemeVars(theme: string): Record<string, string> {
	// Use cached value when available
	const cacheKey = theme || "default";
	if (__themeVarCache.has(cacheKey)) return __themeVarCache.get(cacheKey)!;

	const root = document.documentElement;
	// We'll compute by temporarily setting data-theme only when needed, but minimize DOM thrash.
	const prev = root.getAttribute("data-theme");

	// Support 'system' by using matchMedia, without permanently changing the attribute.
	if (theme && theme !== "system") {
		root.setAttribute("data-theme", theme);
	} else if (theme === "system") {
		const sys = detectSystemTheme();
		root.setAttribute("data-theme", sys);
	} else {
		root.removeAttribute("data-theme");
	}

	const cs = getComputedStyle(root);
	const keys = ["--clr-surface-a0", "--clr-surface-a10", "--clr-surface-a20", "--clr-primary-a10", "--clr-primary-a20"];
	const out: Record<string, string> = {};
	for (const k of keys) {
		out[k] = cs.getPropertyValue(k) || "";
	}

	// Restore previous data-theme attribute
	if (prev === null) {
		root.removeAttribute("data-theme");
	} else {
		root.setAttribute("data-theme", prev);
	}

	__themeVarCache.set(cacheKey, out);
	return out;
}

const PicturePickerConfig = ({ name, description, menu, value, onChange = () => {}, disabled = false, hint, availableOn = ["windows", "mac"], children }: PicturePickerProps) => {
	const platform = getPlatform();
	const isAvailable = !availableOn || availableOn.includes(platform);
	const rows = menu.rows && menu.rows > 0 ? menu.rows : 1;

	const [, setRevision] = useState(0);

	useEffect(() => {
		if (!isAvailable) return;
		const handler = () => setRevision((r) => r + 1);
		window.addEventListener?.("theme-system-changed", handler as EventListener);
		return () => {
			window.removeEventListener?.("theme-system-changed", handler as EventListener);
		};
	}, [isAvailable]);

	if (!isAvailable) return null;

	const optionVars: Record<string, Record<string, string>> = {};
	if (typeof window !== "undefined") {
		for (const opt of menu.options) {
			optionVars[opt.value] = readThemeVars(opt.value);
		}
	}

	return (
		<div data-settingtype="picturePickerGrid" className="setting">
			<div className="settingContent">
				<span className="settingInfo">
					<h3 className="settingLabel">{name}</h3>
					<p className="settingDesc">{description}</p>
				</span>
			</div>
			<div className="picture-picker">
				{Array.from({ length: rows }).map((_, rowIdx) => (
					<div key={rowIdx} className="picture-picker__row">
						{menu.options.slice(rowIdx * Math.ceil(menu.options.length / rows), (rowIdx + 1) * Math.ceil(menu.options.length / rows)).map((opt) => {
							const vars = optionVars[opt.value] || {};
							return (
								<div key={opt.value} className="picture-picker__item">
									<button type="button" disabled={disabled} className={`${opt.value === value ? "selected" : ""} picture-picker__button`} onClick={() => onChange(opt.value)}>
										<div className="picture-picker__preview">{opt.previewRenderer(vars)}</div>
										<div className="picture-picker__labelWrap">
											<div className="picture-picker__label">{opt.label}</div>
										</div>
										{opt.subLabel ? <span className="picture-picker__badge">{opt.subLabel}</span> : null}
									</button>
								</div>
							);
						})}
					</div>
				))}
			</div>
			{hint ? <Hint type={hint.type} label={hint.label} /> : null}
			{children}
		</div>
	);
};

const ActionMenuConfig = ({ name, description, menu, disabled = false, hint, availableOn = ["windows", "mac"], children }: ActionMenuProps) => {
	const platform = getPlatform();
	if (availableOn && !availableOn.includes(platform)) return null;

	return (
		<div data-settingtype="actionButton" className="setting">
			<div className="settingContent">
				<span className="settingInfo">
					<h3 className="settingLabel">{name}</h3>
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

export { SwitchConfig, ButtonActionConfig, SelectionMenuConfig, ActionMenuConfig, PicturePickerConfig };
export default InfoConfig;
