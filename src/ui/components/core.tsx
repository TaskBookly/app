import React from "react";
import { jumpToSection } from "./nav";

interface IcoButtonProps {
	text?: string;
	icon?: string;
	disabled?: boolean;
	onClick?: { jumpToSection?: string; action?: () => void };
	className?: string;
	tooltip?: string;
}

const Container: React.FC<{ name: string; header?: { title: string; icon: string }; className?: string; children?: React.ReactNode }> = ({ name, header, children, className = "" }) => (
	<div id={name} className="container">
		{header ? (
			<div className="containerHeader">
				<span className="material-symbols-rounded">{header?.icon}</span>
				<label>{header?.title}</label>
			</div>
		) : null}

		<div className={`containerContent ${className}`}>{children}</div>
	</div>
);

const IcoButton: React.FC<IcoButtonProps> = ({ text, icon, disabled = false, onClick, className = "", tooltip }) => {
	const handleClick = () => {
		if (onClick?.action) {
			onClick.action();
		}
		if (onClick?.jumpToSection) {
			jumpToSection(onClick.jumpToSection);
		}
	};

	return (
		<button data-sect={onClick?.jumpToSection} className={className} disabled={disabled} onClick={handleClick} data-tooltip={tooltip}>
			{icon ? <span className="material-symbols-rounded buttonIcon">{icon}</span> : null}
			{text ? <span className="buttonText">{text}</span> : null}
		</button>
	);
};

interface SelectionMenuOption {
	label: string;
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
	}, [open, buttonRef, menuRef]);

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
			let top = rect.bottom;
			let above = rect.top - menuHeight;
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
	}, [open]);

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
					<span className="material-symbols-rounded" style={{ marginLeft: "auto" }}>
						expand_more
					</span>
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
						<span className="dd-label">{opt.label}</span>
						{opt.value === value && <span className="material-symbols-rounded dd-check">check</span>}
					</div>
				))}
			</DropdownMenu>
		</div>
	);
};

interface ActionMenuOption {
	label: string;
	value: string;
	icon?: string;
	onClick?: () => void;
}

interface ActionMenuProps {
	button: React.ReactNode;
	options: ActionMenuOption[];
	className?: string;
	searchable?: boolean;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ button, options, className = "", searchable = false }) => {
	const ref = React.useRef<HTMLDivElement>(null);
	const buttonRef = React.useRef<HTMLDivElement>(null);
	const [open, setOpen] = React.useState(false);
	const [menuAbove, setMenuAbove] = React.useState(false);
	const menuRef = React.useRef<HTMLDivElement>(null);
	const [search, setSearch] = React.useState("");

	// Infer disabled from button prop if possible
	let isDisabled = false;
	if (React.isValidElement(button) && (button.props as any)?.disabled) {
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
	}, [open]);

	return (
		<div ref={ref} style={{ display: "inline-block", position: "relative" }}>
			<div
				ref={buttonRef}
				onClick={() => {
					if (!isDisabled) setOpen((o) => !o);
				}}
			>
				{React.isValidElement(button)
					? React.cloneElement(
							button as React.ReactElement<any>,
							{
								className: [(button as React.ReactElement<any>).props.className || "", open ? "selected" : ""].filter(Boolean).join(" "),
							} as any
					  )
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
							if (opt.onClick) opt.onClick();
						}}
						role="menuitem"
					>
						<span className="dd-label">{opt.label}</span>
						{opt.icon && <span className="material-symbols-rounded dd-icon">{opt.icon}</span>}
					</div>
				))}
			</DropdownMenu>
		</div>
	);
};

export { Container, SelectionMenu, ActionMenu };
export type { SelectionMenuOption, ActionMenuOption };
export default IcoButton;
