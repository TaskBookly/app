import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import IcoButton, { ActionMenu, SelectionMenu, type ActionMenuOption, type SelectionMenuOption } from "./core";

type PopupValue = string | number | boolean | null;

type PopupValues = Record<string, PopupValue>;

type PopupInputOption = SelectionMenuOption;

type PopupInputType = "text" | "number" | "textarea" | "select" | "checkbox" | "password" | "email" | "url";

type PopupInput = {
	id: string;
	type: PopupInputType;
	label?: string;
	placeholder?: string;
	defaultValue?: string | number | boolean | null;
	options?: PopupInputOption[];
	rows?: number;
	required?: boolean;
	description?: ReactNode;
	min?: number;
	max?: number;
	step?: number;
};

type PopupAction = {
	id: string;
	label: string;
	icon?: IconProp;
	intent?: "primary" | "danger" | "neutral";
	disabled?: boolean | ((values: PopupValues) => boolean);
	closeOnTrigger?: boolean;
	menuOptions?: ActionMenuOption[];
	onMenuSelect?: (optionValue: string, values: PopupValues) => void;
};

interface PopupProps {
	open: boolean;
	title: string;
	message?: ReactNode;
	inputs?: PopupInput[];
	actions: PopupAction[];
	onAction: (actionId: string, values: PopupValues) => void;
	onDismiss?: () => void;
	initialValues?: Partial<PopupValues>;
	dismissible?: boolean;
	onExitComplete?: () => void;
}

const OVERLAY_ANIMATION_MS = 220;
let bodyLockCount = 0;
let bodyOverflowSnapshot = "";
let popupStackCursor = 12000;

const lockBodyScroll = () => {
	if (typeof document === "undefined") return;
	bodyLockCount += 1;
	if (bodyLockCount === 1) {
		bodyOverflowSnapshot = document.body.style.overflow;
		document.body.style.overflow = "hidden";
	}
};

const unlockBodyScroll = () => {
	if (typeof document === "undefined") return;
	bodyLockCount = Math.max(0, bodyLockCount - 1);
	if (bodyLockCount === 0) {
		document.body.style.overflow = bodyOverflowSnapshot;
	}
};

const Popup = ({ open, title, message, inputs = [], actions, onAction, onDismiss, initialValues, dismissible = true, onExitComplete }: PopupProps) => {
	const [portalElement] = useState(() => {
		if (typeof document === "undefined") return null;
		const el = document.createElement("div");
		el.className = "popupPortalHost";
		return el;
	});
	const [shouldRender, setShouldRender] = useState(open);
	const [renderState, setRenderState] = useState<"enter" | "idle" | "exit">(open ? "enter" : "exit");
	const [zIndex, setZIndex] = useState(() => ++popupStackCursor);
	const cardRef = useRef<HTMLDivElement | null>(null);
	const titleId = useMemo(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? `popup-${crypto.randomUUID()}` : `popup-${Math.random().toString(36).slice(2)}`), []);
	const lockRef = useRef(false);
	const exitTimer = useRef<number | undefined>(undefined);
	const idleTimer = useRef<number | undefined>(undefined);
	const prevOpen = useRef(open);
	const overlayPointerDownRef = useRef(false);
	const resolvedInitialValues = useMemo(() => initialValues ?? {}, [initialValues]);
	const computeInitialRawValues = useCallback(() => {
		const map: Record<string, string | boolean> = {};
		for (const input of inputs) {
			const source = resolvedInitialValues[input.id] ?? input.defaultValue;
			if (input.type === "checkbox") {
				map[input.id] = Boolean(source);
			} else if (input.type === "number") {
				if (typeof source === "number") {
					map[input.id] = source.toString();
				} else if (typeof source === "string") {
					map[input.id] = source;
				} else {
					map[input.id] = "";
				}
			} else {
				map[input.id] = source === null || source === undefined ? "" : String(source);
			}
		}
		return map;
	}, [inputs, resolvedInitialValues]);
	const [rawValues, setRawValues] = useState<Record<string, string | boolean>>(() => computeInitialRawValues());

	useEffect(() => {
		if (!portalElement) return;
		document.body.appendChild(portalElement);
		return () => {
			portalElement.remove();
		};
	}, [portalElement]);

	useEffect(() => {
		if (!portalElement) return;
		portalElement.style.zIndex = String(zIndex);
	}, [portalElement, zIndex]);

	useEffect(() => {
		const wasOpen = prevOpen.current;
		if (open && !wasOpen) {
			setZIndex(++popupStackCursor);
			setRawValues(computeInitialRawValues());
		} else if (!open && wasOpen) {
			setRawValues(computeInitialRawValues());
		}
		prevOpen.current = open;
	}, [open, computeInitialRawValues]);

	useEffect(() => {
		if (!open) {
			setRawValues(computeInitialRawValues());
		}
	}, [open, computeInitialRawValues]);

	useEffect(() => {
		if (open) {
			setShouldRender(true);
		}
	}, [open]);

	useEffect(() => {
		if (!shouldRender) return;
		if (open) {
			window.clearTimeout(exitTimer.current);
			setRenderState("enter");
			idleTimer.current = window.setTimeout(() => {
				setRenderState("idle");
			}, OVERLAY_ANIMATION_MS);
		} else {
			window.clearTimeout(idleTimer.current);
			setRenderState("exit");
			exitTimer.current = window.setTimeout(() => {
				setShouldRender(false);
			}, OVERLAY_ANIMATION_MS);
		}
	}, [open, shouldRender]);

	useEffect(() => {
		return () => {
			window.clearTimeout(exitTimer.current);
			window.clearTimeout(idleTimer.current);
		};
	}, []);

	useEffect(() => {
		if (shouldRender && !lockRef.current) {
			lockBodyScroll();
			lockRef.current = true;
		} else if (!shouldRender && lockRef.current) {
			unlockBodyScroll();
			lockRef.current = false;
		}
	}, [shouldRender]);

	useEffect(() => {
		return () => {
			if (lockRef.current) {
				unlockBodyScroll();
			}
		};
	}, []);

	const exitCompleteRef = useRef(false);

	const isActionMenuValueOption = (option: ActionMenuOption): option is Extract<ActionMenuOption, { value: string }> => {
		return typeof option === "object" && option !== null && "value" in option;
	};

	const isNumberWithinStep = useCallback((value: number, config: PopupInput) => {
		if (typeof config.step !== "number" || !Number.isFinite(config.step) || config.step <= 0) {
			return true;
		}
		const base = typeof config.min === "number" && Number.isFinite(config.min) ? config.min : 0;
		const diff = Math.abs(value - base);
		const step = config.step;
		const remainder = diff % step;
		const epsilon = step / 1_000_000;
		return remainder < epsilon || Math.abs(remainder - step) < epsilon;
	}, []);

	const isInputValueValid = useCallback(
		(input: PopupInput, raw: string | boolean | undefined): boolean => {
			if (input.type === "checkbox") {
				return true;
			}
			if (input.type === "select") {
				const value = typeof raw === "string" ? raw : "";
				if (input.required) {
					return value.trim().length > 0;
				}
				return true;
			}
			if (input.type === "number") {
				const value = typeof raw === "string" ? raw.trim() : "";
				if (!value) {
					return input.required ? false : true;
				}
				const numeric = Number(value);
				if (!Number.isFinite(numeric)) {
					return false;
				}
				if (typeof input.min === "number" && Number.isFinite(input.min) && numeric < input.min) {
					return false;
				}
				if (typeof input.max === "number" && Number.isFinite(input.max) && numeric > input.max) {
					return false;
				}
				if (!isNumberWithinStep(numeric, input)) {
					return false;
				}
				return true;
			}

			const value = typeof raw === "string" ? raw : "";
			if (!input.required) {
				return true;
			}
			return value.trim().length > 0;
		},
		[isNumberWithinStep]
	);

	const inputValidity = useMemo(() => {
		const map = new Map<string, boolean>();
		for (const input of inputs) {
			map.set(input.id, isInputValueValid(input, rawValues[input.id]));
		}
		return map;
	}, [inputs, rawValues, isInputValueValid]);

	const hasInvalidInputs = useMemo(() => {
		for (const input of inputs) {
			if (!inputValidity.get(input.id)) {
				return true;
			}
		}
		return false;
	}, [inputs, inputValidity]);

	useEffect(() => {
		if (!open && !shouldRender && renderState === "exit") {
			if (!exitCompleteRef.current) {
				exitCompleteRef.current = true;
				onExitComplete?.();
			}
		} else if (open) {
			exitCompleteRef.current = false;
		}
	}, [open, shouldRender, renderState, onExitComplete]);

	useEffect(() => {
		if (!shouldRender || !dismissible) return;
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === "Escape" && dismissible && onDismiss) {
				onDismiss();
			}
		};
		window.addEventListener("keydown", handleKey);
		return () => {
			window.removeEventListener("keydown", handleKey);
		};
	}, [shouldRender, dismissible, onDismiss]);

	useEffect(() => {
		if (renderState !== "enter") return;
		const frame = requestAnimationFrame(() => {
			if (!cardRef.current) return;
			const focusable = cardRef.current.querySelector<HTMLElement>("input, select, textarea, button:not([disabled]), [tabindex]:not([tabindex='-1'])");
			focusable?.focus();
		});
		return () => {
			cancelAnimationFrame(frame);
		};
	}, [renderState]);

	const resolvedValues = useMemo<PopupValues>(() => {
		const map: PopupValues = {};
		for (const input of inputs) {
			const raw = rawValues[input.id];
			if (input.type === "checkbox") {
				map[input.id] = Boolean(raw);
			} else if (input.type === "number") {
				const str = typeof raw === "string" ? raw : "";
				if (!str.trim()) {
					map[input.id] = null;
				} else {
					const parsed = Number(str);
					map[input.id] = Number.isNaN(parsed) ? null : parsed;
				}
			} else {
				map[input.id] = typeof raw === "string" ? raw : "";
			}
		}
		return map;
	}, [inputs, rawValues]);

	const handleOverlayPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		overlayPointerDownRef.current = event.target === event.currentTarget;
	};

	const handleOverlayPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.target !== event.currentTarget) {
			overlayPointerDownRef.current = false;
		}
	};

	const handleOverlayPointerCancel = () => {
		overlayPointerDownRef.current = false;
	};

	const handleOverlayClick = (event: ReactMouseEvent<HTMLDivElement>) => {
		if (!overlayPointerDownRef.current) {
			return;
		}
		overlayPointerDownRef.current = false;
		if (event.target === event.currentTarget && dismissible && onDismiss) {
			onDismiss();
		}
	};

	const renderField = (input: PopupInput, labelId: string) => {
		const value = rawValues[input.id];

		if (input.type === "textarea") {
			return <textarea id={input.id} name={input.id} required={input.required} placeholder={input.placeholder} value={typeof value === "string" ? value : ""} rows={input.rows ?? 4} onChange={(event) => setRawValues((prev) => ({ ...prev, [input.id]: event.target.value }))} aria-labelledby={labelId} className="popupFieldControl" />;
		}

		if (input.type === "select") {
			const selected = typeof value === "string" ? value : "";
			return (
				<div className="popupSelectionWrap" aria-labelledby={labelId}>
					<SelectionMenu options={input.options ?? []} value={selected} onChange={(next) => setRawValues((prev) => ({ ...prev, [input.id]: next }))} placeholder={input.placeholder} style={{ width: "100%", display: "block" }} className="popupSelectionMenu" />
				</div>
			);
		}

		if (input.type === "checkbox") {
			return <input id={input.id} name={input.id} type="checkbox" checked={Boolean(value)} required={input.required} onChange={(event) => setRawValues((prev) => ({ ...prev, [input.id]: event.target.checked }))} aria-labelledby={labelId} className="popupToggleControl" />;
		}

		if (input.type === "number") {
			const numericValue = typeof value === "string" ? value : "";
			return (
				<input
					id={input.id}
					name={input.id}
					type="number"
					required={input.required}
					placeholder={input.placeholder}
					value={numericValue}
					onChange={(event) =>
						setRawValues((prev) => ({
							...prev,
							[input.id]: event.target.value,
						}))
					}
					aria-labelledby={labelId}
					className="popupFieldControl"
					min={input.min}
					max={input.max}
					step={input.step}
					inputMode="decimal"
				/>
			);
		}

		const inputType = input.type === "password" || input.type === "email" || input.type === "url" ? input.type : "text";
		return <input id={input.id} name={input.id} type={inputType} required={input.required} placeholder={input.placeholder} value={typeof value === "string" ? value : ""} onChange={(event) => setRawValues((prev) => ({ ...prev, [input.id]: event.target.value }))} aria-labelledby={labelId} className="popupFieldControl" min={input.min} max={input.max} step={input.step} />;
	};

	if (!shouldRender || !portalElement) return null;

	return createPortal(
		<div className="popupOverlay" data-state={renderState} onPointerDown={handleOverlayPointerDown} onPointerUp={handleOverlayPointerUp} onPointerCancel={handleOverlayPointerCancel} onClick={handleOverlayClick} style={{ zIndex }}>
			<div className="popupCard" data-state={renderState} ref={cardRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
				<header className="popupHeader">
					<div className="popupHeaderText">
						<h2 id={titleId} className="popupTitle">
							{title}
						</h2>
						{message ? <div className="popupMessage">{message}</div> : null}
					</div>
					{dismissible && onDismiss ? (
						<button type="button" className="popupCloseButton" onClick={onDismiss} aria-label="Close">
							<FontAwesomeIcon icon={faXmark} />
						</button>
					) : null}
				</header>
				{inputs.length > 0 ? (
					<div className="popupBody">
						<div className="popupInputs">
							{inputs.map((input) => {
								const labelId = `${titleId}-${input.id}-label`;
								return (
									<div key={input.id} className="popupField" role="group" aria-labelledby={labelId}>
										<span className="popupFieldLabel" id={labelId}>
											{input.label}
											{input.required ? <span className="popupFieldRequired">*</span> : null}
										</span>
										{input.description ? <div className="popupFieldDescription">{input.description}</div> : null}
										{renderField(input, labelId)}
									</div>
								);
							})}
						</div>
					</div>
				) : null}
				{actions.length !== 0
					? [
							<footer className="popupActions">
								{actions.map((action) => {
									const computedDisabled = typeof action.disabled === "function" ? action.disabled(resolvedValues) : Boolean(action.disabled);
									const disableForValidation = action.intent === "primary" && hasInvalidInputs;
									const classNames = ["popupActionButton"];
									if (action.intent === "primary") {
										classNames.push("type-primary");
									}
									if (action.intent === "danger") {
										classNames.push("type-danger");
									}
									if (action.menuOptions && action.menuOptions.length > 0) {
										const hasInteractiveOptions = action.menuOptions.some((option) => isActionMenuValueOption(option));
										return (
											<ActionMenu
												key={action.id}
												options={action.menuOptions}
												button={<IcoButton text={action.label} icon={action.icon} disabled={computedDisabled || disableForValidation || !hasInteractiveOptions} className={classNames.join(" ")} />}
												className="popupActionMenu"
												onOptionSelect={(selected) => {
													const option = action.menuOptions?.find((item): item is Extract<ActionMenuOption, { value: string }> => isActionMenuValueOption(item) && item.value === selected);
													if (!option) {
														return;
													}
													if ("onClick" in option && typeof option.onClick === "function") {
														option.onClick();
													}
													if (action.onMenuSelect) action.onMenuSelect(option.value, resolvedValues);
													onAction(`${action.id}:${option.value}`, resolvedValues);
													if (action.closeOnTrigger !== false && onDismiss) {
														onDismiss();
													}
												}}
											/>
										);
									}
									return (
										<IcoButton
											key={action.id}
											text={action.label}
											icon={action.icon}
											disabled={computedDisabled || disableForValidation}
											className={classNames.join(" ")}
											onClick={{
												action: () => {
													onAction(action.id, resolvedValues);
													if (action.closeOnTrigger !== false && onDismiss) {
														onDismiss();
													}
												},
											}}
										/>
									);
								})}
							</footer>,
					  ]
					: []}
			</div>
		</div>,
		portalElement
	);
};

export type { PopupAction, PopupInput, PopupInputOption, PopupProps, PopupValue, PopupValues };
export default Popup;
