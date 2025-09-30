import React from "react";
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
}

const ContainerGroup: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	return children ? <div className="containerGroup">{children}</div> : null;
};

const Container: React.FC<{ name: string; header?: { title: string; icon: IconProp }; id?: string; className?: string; children?: React.ReactNode }> = ({ name, header, children, id, className = "" }) => {
	const [isVisible, setIsVisible] = React.useState(true);
	const contentRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
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
					<h2>{header.title}</h2>

					<FontAwesomeIcon icon={header.icon} widthAuto />
				</div>
			) : null}

			<div className="containerContent" ref={contentRef}>
				{children}
			</div>
		</div>
	);
};

const IcoButton: React.FC<IcoButtonProps> = ({ text, icon, iconWidthAuto = false, disabled = false, onClick, id, className, tooltip }) => {
	const handleClick = () => {
		if (onClick?.action) {
			onClick.action();
		}
		if (onClick?.jumpToSection) {
			jumpToSection(onClick.jumpToSection);
		}
	};

	return (
		<button data-sect={onClick?.jumpToSection} id={id} className={className} disabled={disabled} onClick={handleClick} data-tooltip={tooltip}>
			{icon ? <FontAwesomeIcon className="buttonIcon" icon={icon} widthAuto={iconWidthAuto ? true : false} /> : null}
			{text ? <span className="buttonText">{text}</span> : null}
		</button>
	);
};

const Hint: React.FC<{ type: HintType; label: string }> = ({ type, label }) => {
	return (
		<div className={`hint hintType-${type}`}>
			<FontAwesomeIcon className="hintIcon" icon={type === "info" ? faCircleInfo : type === "warning" ? faWarning : type === "error" ? faCircleXmark : type === "success" ? faCircleCheck : type === "processing" ? faCompass : faCircleQuestion} />
			<span className="hintLabel">{label}</span>
		</div>
	);
};

interface SelectionMenuOption {
	label: string;
	subLabel?: string;
	value: string;
}

interface SelectionMenuProps {
	options: SelectionMenuOption[];
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	searchable?: boolean;
	placeholder?: string;
	className?: string;
}

// Shared dropdown menu props type
interface DropdownMenuProps {
	open: boolean;
	buttonRef: React.RefObject<HTMLDivElement | null>;
	menuRef: React.RefObject<HTMLDivElement | null>;
	setOpen: React.Dispatch<React.SetStateAction<boolean>>;
	setMenuAbove: React.Dispatch<React.SetStateAction<boolean>>;
	menuAbove: boolean;
	children: React.ReactNode;
	className?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ open, buttonRef, menuRef, setOpen, setMenuAbove, menuAbove, children, className = "" }) => {
	React.useEffect(() => {
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

	React.useEffect(() => {
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

const SelectionMenu: React.FC<SelectionMenuProps> = ({ options, value, onChange, disabled = false, searchable = false, placeholder = "Select..." }) => {
	const [search, setSearch] = React.useState("");
	const ref = React.useRef<HTMLDivElement>(null);
	const buttonRef = React.useRef<HTMLDivElement>(null);
	const [open, setOpen] = React.useState(false);
	const [menuAbove, setMenuAbove] = React.useState(false);
	const menuRef = React.useRef<HTMLDivElement>(null);

	const filteredOptions = searchable && search ? options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase())) : options;
	const selectedLabel = options.find((opt) => opt.value === value)?.label || placeholder;

	React.useEffect(() => {
		if (!open && search) setSearch("");
	}, [open, search]);

	return (
		<div ref={ref} style={{ display: "inline-block", position: "relative" }}>
			<div
				ref={buttonRef}
				onClick={() => {
					if (!disabled) setOpen((o) => !o);
				}}
			>
				<button type="button" className={`custom-dropdown${open ? " selected" : ""}`} disabled={disabled} aria-haspopup="listbox" aria-expanded={open}>
					<span>{selectedLabel}</span>
					<FontAwesomeIcon icon={faAngleDown} />
				</button>
			</div>
			<DropdownMenu open={open} buttonRef={buttonRef} menuRef={menuRef} setOpen={setOpen} setMenuAbove={setMenuAbove} menuAbove={menuAbove}>
				{searchable && <input type="text" className="dropdown-search" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} disabled={disabled} autoFocus />}
				{filteredOptions.length === 0 && <div className="dropdown-empty">No options</div>}
				{filteredOptions.map((opt) => (
					<div
						key={opt.value}
						className={`dropdown-option${opt.value === value ? " selected" : ""}`}
						onClick={() => {
							onChange(opt.value);
							setOpen(false);
							setSearch("");
						}}
						role="option"
						aria-selected={opt.value === value}
					>
						<span className="dd-labels">
							<label className="dd-mainLabel">{opt.label}</label>
							<label className="dd-subLabel">{opt.subLabel}</label>
						</span>
						<span className="dd-check">{opt.value === value ? <FontAwesomeIcon icon={faCheck} widthAuto /> : null}</span>
					</div>
				))}
			</DropdownMenu>
		</div>
	);
};

interface ActionMenuOption {
	label: string;
	subLabel?: string;
	value: string;
	icon?: IconProp;
	onClick?: () => void;
}

interface ActionMenuProps {
	button: React.ReactNode;
	options: ActionMenuOption[];
	className?: string;
	searchable?: boolean;
	onOptionSelect?: (value: string) => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ button, options, className = "", searchable = false, onOptionSelect }) => {
	const ref = React.useRef<HTMLDivElement>(null);
	const buttonRef = React.useRef<HTMLDivElement>(null);
	const [open, setOpen] = React.useState(false);
	const [menuAbove, setMenuAbove] = React.useState(false);
	const menuRef = React.useRef<HTMLDivElement>(null);
	const [search, setSearch] = React.useState("");

	// Infer disabled from button prop if possible
	let isDisabled = false;
	if (React.isValidElement(button) && (button.props as { disabled?: boolean })?.disabled) {
		isDisabled = true;
	}

	function getFilteredOptions(opts: ActionMenuOption[], search: string): ActionMenuOption[] {
		if (!search) return opts;
		const lower = search.toLowerCase();
		return opts.filter((opt) => opt.label.toLowerCase().includes(lower));
	}
	const filteredOptions = getFilteredOptions(options, search);

	React.useEffect(() => {
		if (!open && search) setSearch("");
	}, [open, search]);

	return (
		<div ref={ref} style={{ display: "inline-block", position: "relative" }}>
			<div
				ref={buttonRef}
				onClick={() => {
					if (!isDisabled) setOpen((o) => !o);
				}}
			>
				{React.isValidElement(button)
					? React.cloneElement(button as React.ReactElement<{ className?: string; disabled?: boolean }>, {
							className: [(button as React.ReactElement<{ className?: string }>).props.className || "", open ? "selected" : ""].filter(Boolean).join(" "),
					  })
					: button}
			</div>
			<DropdownMenu open={open} buttonRef={buttonRef} menuRef={menuRef} setOpen={setOpen} setMenuAbove={setMenuAbove} menuAbove={menuAbove} className={className}>
				{searchable && <input type="text" className="dropdown-search" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />}
				{filteredOptions.length === 0 && <div className="dropdown-empty">No options</div>}
				{filteredOptions.map((opt) => (
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
						<span className="dd-labels">
							<label className="dd-mainLabel">{opt.label}</label>
							<label className="dd-subLabel">{opt.subLabel}</label>
						</span>
						{opt.icon && <FontAwesomeIcon className="dd-icon" icon={opt.icon} />}
					</div>
				))}
			</DropdownMenu>
		</div>
	);
};

export { ContainerGroup, Container, SelectionMenu, ActionMenu, Hint };
export type { SelectionMenuOption, ActionMenuOption, HintType };
export default IcoButton;
