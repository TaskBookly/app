import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, Dispatch, ReactElement, ReactNode, RefObject, SetStateAction } from "react";
import { jumpToSection } from "./nav";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faAngleDown, faCheck, faCircleCheck, faCircleInfo, faCircleQuestion, faCircleXmark, faCompass, faWarning } from "@fortawesome/free-solid-svg-icons";

type HintType = "info" | "warning" | "error" | "success" | "processing";

interface IcoButtonProps {
	text?: string;
	icon?: IconProp;
	iconWidthAuto?: boolean;
	disabled?: boolean;
	onClick?: { jumpToSection?: string; action?: () => void };
	id?: string;
	className?: string;
	tooltip?: string;
	style?: CSSProperties;
}

interface ContainerProps {
	name: string;
	header?: {
		title: string;
		icon: IconProp;
		buttons?: IcoButtonProps[];
	};
	id?: string;
	className?: string;
	children?: ReactNode;
}

interface ContainerGroupProps {
	children?: ReactNode;
}

const ContainerGroup = ({ children }: ContainerGroupProps) => {
	return children ? <div className="containerGroup">{children}</div> : null;
};

const Container = ({ name, header, children, id, className = "" }: ContainerProps) => {
	const [isVisible, setIsVisible] = useState(true);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (contentRef.current) {
			const hasVisibleContent =
				contentRef.current.children.length > 0 &&
				Array.from(contentRef.current.children).some((child) => {
					const element = child as HTMLElement;
					return element.offsetHeight > 0 || element.offsetWidth > 0 || element.textContent?.trim();
				});
			setIsVisible(hasVisibleContent);
		}
	}, [children]);

	if (!children || !isVisible) return null;

	return (
		<div data-container={name} id={id} className={`container ${className}`}>
			{header ? (
				<div className="containerHeader">
					<div className="containerHeaderTitle">
						<FontAwesomeIcon icon={header.icon} widthAuto />
						<h2>{header.title}</h2>
					</div>

					{header.buttons ? (
						<div className="containerHeaderButtons buttonGroup">
							{header.buttons.map((buttonProps, index) => (
								<IcoButton key={buttonProps.id ?? `header-btn-${index}`} {...buttonProps} />
							))}
						</div>
					) : null}
				</div>
			) : null}

			<div className="containerContent" ref={contentRef}>
				{children}
			</div>
		</div>
	);
};

const IcoButton = ({ text, icon, iconWidthAuto = false, disabled = false, onClick, id, className, tooltip, style }: IcoButtonProps) => {
	const handleClick = () => {
		if (disabled) return;
		if (onClick?.action) {
			onClick.action();
		}
		if (onClick?.jumpToSection) {
			jumpToSection(onClick.jumpToSection);
		}
	};

	return (
		<button data-sect={onClick?.jumpToSection} id={id} className={className} aria-disabled={disabled} onClick={handleClick} data-tooltip={tooltip} style={style}>
			{icon ? <FontAwesomeIcon className="buttonIcon" icon={icon} widthAuto={iconWidthAuto ? true : false} /> : null}
			{text ? <span className="buttonText">{text}</span> : null}
		</button>
	);
};

interface HintProps {
	type: HintType;
	label: string;
}

const Hint = ({ type, label }: HintProps) => {
	return (
		<div className={`hint hintType-${type}`}>
			<FontAwesomeIcon className="hintIcon" icon={type === "info" ? faCircleInfo : type === "warning" ? faWarning : type === "error" ? faCircleXmark : type === "success" ? faCircleCheck : type === "processing" ? faCompass : faCircleQuestion} />
			<span className="hintLabel">{label}</span>
		</div>
	);
};

type MenuOptionData = {
	icon: IconProp;
	data: string | number | boolean;
};

type MenuSeparatorOption = {
	type: "separator";
	label?: string;
};

interface SelectionMenuValueOption {
	label: string;
	subLabel?: string;
	value: string;
	data?: MenuOptionData[];
	type?: "option";
	icon?: IconProp;
	disabled?: boolean;
	processing?: boolean;
}

type SelectionMenuOption = SelectionMenuValueOption | MenuSeparatorOption;

interface SelectionMenuProps {
	options: SelectionMenuOption[];
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	searchable?: boolean;
	placeholder?: string;
	className?: string;
	style?: CSSProperties;
	tooltip?: string;
}

// Shared dropdown menu props type
interface DropdownMenuProps {
	open: boolean;
	buttonRef: RefObject<HTMLDivElement | null>;
	menuRef: RefObject<HTMLDivElement | null>;
	setOpen: Dispatch<SetStateAction<boolean>>;
	setMenuAbove: Dispatch<SetStateAction<boolean>>;
	menuAbove: boolean;
	children: ReactNode;
	className?: string;
}

const DropdownMenu = ({ open, buttonRef, menuRef, setOpen, setMenuAbove, menuAbove, children, className = "" }: DropdownMenuProps) => {
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (buttonRef.current && menuRef.current && !buttonRef.current.contains(event.target as Node) && !menuRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}
		function handleScroll(event: Event) {
			if (menuRef.current && event.target instanceof Node && menuRef.current.contains(event.target as Node)) {
				return;
			}
			setOpen(false);
		}
		function handleResize() {
			setOpen(false);
		}
		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("scroll", handleScroll, true);
			window.addEventListener("resize", handleResize);
		} else {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("scroll", handleScroll, true);
			window.removeEventListener("resize", handleResize);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("scroll", handleScroll, true);
			window.removeEventListener("resize", handleResize);
		};
	}, [open, buttonRef, menuRef, setOpen]);

	useEffect(() => {
		if (open && buttonRef.current && menuRef.current) {
			const rect = buttonRef.current.getBoundingClientRect();
			const menu = menuRef.current;
			const menuHeight = menu.offsetHeight; // always use actual
			const menuWidth = menu.offsetWidth; // always use actual
			const padding = 8; // smaller margin for small dropdowns

			// Horizontal positioning
			let left = rect.left + rect.width / 2 - menuWidth / 2;
			if (menuWidth < rect.width) {
				// If menu is smaller than button, align left
				left = rect.left;
			}
			if (left + menuWidth > window.innerWidth - padding) {
				left = window.innerWidth - menuWidth - padding;
			}
			if (left < padding) {
				left = padding;
			}

			// Vertical positioning
			const top = rect.bottom;
			const above = rect.top - menuHeight;
			let useAbove = false;
			if (top + menuHeight > window.innerHeight - padding && above > padding) {
				useAbove = true;
			}
			if (useAbove && above < padding) {
				useAbove = false;
			}
			setMenuAbove(useAbove);
			menu.style.left = left + "px";
			menu.style.minWidth = Math.max(rect.width, menuWidth) + "px";
			if (useAbove) {
				menu.style.top = "";
				menu.style.bottom = window.innerHeight - rect.top + 2 + "px";
			} else {
				menu.style.bottom = "";
				menu.style.top = rect.bottom + 2 + "px";
			}
		}
	}, [open, buttonRef, menuRef, setMenuAbove]);

	if (!open) return null;
	return (
		<div className={`dropdown-menu${menuAbove ? " dropdown-menu--above" : ""} ${className}`.trim()} ref={menuRef}>
			{children}
		</div>
	);
};

const SelectionMenu = ({ options, value, onChange, disabled = false, searchable = false, placeholder = "Select...", className = "", style, tooltip }: SelectionMenuProps) => {
	const [search, setSearch] = useState("");
	const buttonRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [menuAbove, setMenuAbove] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	const selectedLabel = useMemo(() => {
		const match = options.find((opt): opt is SelectionMenuValueOption => opt.type !== "separator" && opt.value === value);
		return match?.label ?? placeholder;
	}, [options, value, placeholder]);

	const filteredOptions = useMemo(() => {
		if (!searchable || !search.trim()) {
			return options;
		}
		const lower = search.trim().toLowerCase();
		return options.filter((opt) => {
			if (opt.type === "separator") {
				return false;
			}
			return opt.label.toLowerCase().includes(lower) || opt.subLabel?.toLowerCase().includes(lower);
		});
	}, [options, search, searchable]);

	useEffect(() => {
		if (!open && search) setSearch("");
	}, [open, search]);

	const hasIcons = useMemo(() => {
		return options.some((opt) => opt.type !== "separator" && opt.icon);
	}, [options]);

	return (
		<div className={className} style={{ display: "inline-flex", position: "relative", ...(style ?? {}) }}>
			<div
				ref={buttonRef}
				onClick={() => {
					if (!disabled) setOpen((o) => !o);
				}}
				style={{ display: "flex", flex: 1 }}
			>
				<button type="button" className={`custom-dropdown${open ? " selected" : ""}`} aria-disabled={disabled} aria-haspopup="listbox" aria-expanded={open} data-tooltip={tooltip} style={{ height: "100%", width: "100%" }}>
					<span>{selectedLabel}</span>
					<FontAwesomeIcon icon={faAngleDown} />
				</button>
			</div>
			<DropdownMenu open={open} buttonRef={buttonRef} menuRef={menuRef} setOpen={setOpen} setMenuAbove={setMenuAbove} menuAbove={menuAbove}>
				{searchable && <input type="text" className="dropdown-search" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} disabled={disabled} autoFocus />}
				{filteredOptions.length === 0 && <div className="dropdown-empty">No options</div>}
				{filteredOptions.map((opt, index) => {
					if (opt.type === "separator") {
						return (
							<div key={`separator-${index}`} className="dropdown-separator" role="separator">
								<div className="dropdown-separator-line"></div>
								<div className="dropdown-separator-label">{opt.label ? <span>{opt.label}</span> : null}</div>
							</div>
						);
					}
					return (
						<div
							key={opt.value}
							className={`dropdown-option${opt.value === value ? " selected" : ""}`}
							onClick={() => {
								if (opt.disabled) return;
								onChange(opt.value);
								setOpen(false);
								setSearch("");
							}}
							role="option"
							aria-selected={opt.value === value}
							aria-disabled={opt.disabled}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
								{hasIcons && <div style={{ width: "1.25em", display: "flex", justifyContent: "center", flexShrink: 0 }}>{opt.icon ? <FontAwesomeIcon className="dd-icon" icon={opt.icon} /> : null}</div>}
								<span className="dd-labels">
									<label className="dd-mainLabel">{opt.label}</label>
									<label className="dd-subLabel">{opt.subLabel}</label>

									{opt.data ? (
										<div className="dd-data">
											{opt.data.map((d, i) => (
												<div key={i} className="dd-data-item">
													<FontAwesomeIcon icon={d.icon} />
													<span>{String(d.data)}</span>
												</div>
											))}
										</div>
									) : null}
								</span>
							</div>
							<span className="dd-check">{opt.processing ? <FontAwesomeIcon spin icon={faCompass} /> : opt.value === value ? <FontAwesomeIcon icon={faCheck} /> : null}</span>
						</div>
					);
				})}
			</DropdownMenu>
		</div>
	);
};

interface ActionMenuValueOption {
	label: string;
	subLabel?: string;
	value: string;
	icon?: IconProp;
	onClick?: () => void;
	type?: "option";
	disabled?: boolean;
	processing?: boolean;
}

interface ActionMenuToggleOption {
	type: "toggle";
	label: string;
	subLabel?: string;
	value: boolean;
	onChange: (value: boolean) => void;
	icon?: IconProp;
	disabled?: boolean;
}

interface ActionMenuSelectionGroupOption {
	type: "selectionGroup";
	value: string;
	onChange: (value: string) => void;
	options: { label: string; value: string; icon?: IconProp; disabled?: boolean; processing?: boolean }[];
}

type ActionMenuOption = ActionMenuValueOption | MenuSeparatorOption | ActionMenuToggleOption | ActionMenuSelectionGroupOption;

interface ActionMenuProps {
	button: ReactNode;
	options: ActionMenuOption[];
	className?: string;
	searchable?: boolean;
	onOptionSelect?: (value: string) => void;
	tooltip?: string;
}

const ActionMenu = ({ button, options, className = "", searchable = false, onOptionSelect, tooltip }: ActionMenuProps) => {
	const buttonRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [menuAbove, setMenuAbove] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const [search, setSearch] = useState("");

	// Infer disabled from button prop if possible
	const isDisabled = isValidElement(button) && Boolean((button.props as { disabled?: boolean })?.disabled);

	function getFilteredOptions(opts: ActionMenuOption[], searchValue: string): ActionMenuOption[] {
		if (!searchValue) return opts;
		const lower = searchValue.toLowerCase();
		return opts.filter((opt) => {
			if (opt.type === "separator") {
				return false;
			}
			if (opt.type === "selectionGroup") {
				return opt.options.some((o) => o.label.toLowerCase().includes(lower));
			}
			return opt.label.toLowerCase().includes(lower) || opt.subLabel?.toLowerCase().includes(lower);
		});
	}
	const filteredOptions = useMemo(() => getFilteredOptions(options, search), [options, search]);

	const hasIcons = useMemo(() => {
		return options.some((opt) => {
			if (opt.type === "separator") return false;
			if (opt.type === "selectionGroup") return opt.options.some((o) => o.icon);
			if (opt.type === "toggle") return opt.icon;
			return opt.icon;
		});
	}, [options]);

	useEffect(() => {
		if (!open && search) setSearch("");
	}, [open, search]);

	return (
		<div style={{ display: "inline-flex", position: "relative" }} data-tooltip={tooltip}>
			<div
				ref={buttonRef}
				onClick={() => {
					if (!isDisabled) setOpen((o) => !o);
				}}
				style={{ display: "flex", flex: 1 }}
			>
				{isValidElement(button)
					? cloneElement(button as ReactElement<{ className?: string; disabled?: boolean; style?: CSSProperties }>, {
							className: [(button as ReactElement<{ className?: string }>).props.className || "", open ? "selected" : ""].filter(Boolean).join(" "),
							style: { height: "100%", ...(button as ReactElement<{ style?: CSSProperties }>).props.style },
					  })
					: button}
			</div>
			<DropdownMenu open={open} buttonRef={buttonRef} menuRef={menuRef} setOpen={setOpen} setMenuAbove={setMenuAbove} menuAbove={menuAbove} className={className}>
				{searchable && <input type="text" className="dropdown-search" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />}
				{filteredOptions.length === 0 && <div className="dropdown-empty">No options</div>}
				{filteredOptions.map((opt, index) => {
					if (opt.type === "separator") {
						return (
							<div key={`separator-${index}`} className="dropdown-separator" role="separator">
								<div className="dropdown-separator-line"></div>
								<div className="dropdown-separator-label">{opt.label ? <span>{opt.label}</span> : null}</div>
							</div>
						);
					}
					if (opt.type === "toggle") {
						return (
							<div
								key={`toggle-${index}`}
								className="dropdown-option"
								onClick={(e) => {
									if (opt.disabled) return;
									e.stopPropagation();
									opt.onChange(!opt.value);
								}}
								role="menuitemcheckbox"
								aria-checked={opt.value}
								aria-disabled={opt.disabled}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
									{hasIcons && <div style={{ width: "1.25em", display: "flex", justifyContent: "center", flexShrink: 0 }}>{opt.icon ? <FontAwesomeIcon className="dd-icon" icon={opt.icon} /> : null}</div>}
									<span className="dd-labels">
										<label className="dd-mainLabel">{opt.label}</label>
										{opt.subLabel && <label className="dd-subLabel">{opt.subLabel}</label>}
									</span>
								</div>
								<div className="switchInput" style={{ pointerEvents: "none" }}>
									<input type="checkbox" checked={opt.value} readOnly />
								</div>
							</div>
						);
					}
					if (opt.type === "selectionGroup") {
						return (
							<div key={`group-${index}`} className="dropdown-group">
								{opt.options.map((subOpt) => (
									<div
										key={subOpt.value}
										className={`dropdown-option${opt.value === subOpt.value ? " selected" : ""}`}
										onClick={(e) => {
											if (subOpt.disabled) return;
											e.stopPropagation();
											opt.onChange(subOpt.value);
										}}
										role="menuitemradio"
										aria-checked={opt.value === subOpt.value}
										aria-disabled={subOpt.disabled}
									>
										<div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
											{hasIcons && <div style={{ width: "1.25em", display: "flex", justifyContent: "center", flexShrink: 0 }}>{subOpt.icon ? <FontAwesomeIcon className="dd-icon" icon={subOpt.icon} /> : null}</div>}
											<span className="dd-labels">
												<label className="dd-mainLabel">{subOpt.label}</label>
											</span>
										</div>
										<span className="dd-check">{subOpt.processing ? <FontAwesomeIcon spin icon={faCompass} /> : opt.value === subOpt.value ? <FontAwesomeIcon icon={faCheck} /> : null}</span>
									</div>
								))}
							</div>
						);
					}
					return (
						<div
							key={opt.value}
							className={`dropdown-option`}
							onClick={() => {
								setOpen(false);
								if (onOptionSelect) {
									onOptionSelect(opt.value);
								} else if (opt.onClick) {
									opt.onClick();
								}
							}}
							role="menuitem"
						>
							<div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
								{hasIcons && <div style={{ width: "1.25em", display: "flex", justifyContent: "center", flexShrink: 0 }}>{opt.icon ? <FontAwesomeIcon className="dd-icon" icon={opt.icon} /> : null}</div>}
								<span className="dd-labels">
									<label className="dd-mainLabel">{opt.label}</label>
									{opt.subLabel && <label className="dd-subLabel">{opt.subLabel}</label>}
								</span>
							</div>
							<span className="dd-check">{opt.processing ? <FontAwesomeIcon spin icon={faCompass} /> : null}</span>
						</div>
					);
				})}
			</DropdownMenu>
		</div>
	);
};

export { ContainerGroup, Container, SelectionMenu, ActionMenu, Hint };
export type { SelectionMenuOption, SelectionMenuValueOption, ActionMenuOption, HintType };
export default IcoButton;
