import { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";

interface TooltipState {
	text: string;
	rect: DOMRect | null;
	visible: boolean;
}

const delay: number = 250;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function useTooltip() {
	const [tooltip, setTooltip] = useState<TooltipState>({ text: "", rect: null, visible: false });
	const showTimer = useRef<number | null>(null);
	const hideTimer = useRef<number | null>(null);
	const currentTarget = useRef<HTMLElement | null>(null);

	useEffect(() => {
		function showTooltip(e: Event) {
			const target = (e.target as HTMLElement)?.closest("[data-tooltip]") as HTMLElement | null;
			if (target && target.dataset.tooltip) {
				if (hideTimer.current) {
					clearTimeout(hideTimer.current);
					hideTimer.current = null;
				}
				if (showTimer.current) clearTimeout(showTimer.current);
				currentTarget.current = target;
				showTimer.current = window.setTimeout(() => {
					const rect = target.getBoundingClientRect();
					setTooltip({ text: target.dataset.tooltip!, rect, visible: true });
				}, delay);
			}
		}
		function hideTooltip(e: Event) {
			if (showTimer.current) {
				clearTimeout(showTimer.current);
				showTimer.current = null;
			}
			// Only hide if leaving the current tooltip target
			const related = (e as MouseEvent).relatedTarget as HTMLElement | null;
			if (currentTarget.current && related && related.dataset.tooltip) {
				// Moving directly to another tooltip target, let showTooltip handle it
				return;
			}
			hideTimer.current = window.setTimeout(() => {
				setTooltip((t) => ({ ...t, visible: false }));
				currentTarget.current = null;
			}, 100); // Short delay to allow for fast hover transitions
		}
		document.addEventListener("mouseover", showTooltip);
		document.addEventListener("focusin", showTooltip);
		document.addEventListener("mouseout", hideTooltip);
		document.addEventListener("focusout", hideTooltip);
		return () => {
			document.removeEventListener("mouseover", showTooltip);
			document.removeEventListener("focusin", showTooltip);
			document.removeEventListener("mouseout", hideTooltip);
			document.removeEventListener("focusout", hideTooltip);
			if (showTimer.current) clearTimeout(showTimer.current);
			if (hideTimer.current) clearTimeout(hideTimer.current);
		};
	}, []);
	return tooltip;
}

export function TooltipPortal({ tooltip }: { tooltip: TooltipState }) {
	if (!tooltip.visible && !tooltip.text) return null;
	const padding = 6;
	const width = 220;
	const { innerWidth, innerHeight } = window;
	let left = tooltip.rect ? tooltip.rect.left + tooltip.rect.width / 2 : 0;
	let top = tooltip.rect ? tooltip.rect.bottom + padding + 7 : 0;
	let placement: "top" | "bottom" = "bottom";
	if (tooltip.rect && top + 36 > innerHeight) {
		top = tooltip.rect.top - 36 - padding - 7;
		placement = "top";
	}
	left = clamp(left, 16, innerWidth - 16);
	// Animation: fade+scale from element center, animate out on mouse leave
	const [active, setActive] = useState(false);
	const [shouldRender, setShouldRender] = useState(false);
	useEffect(() => {
		if (tooltip.visible && tooltip.rect) {
			setShouldRender(true);
			// Use requestAnimationFrame for reliable animation triggering
			requestAnimationFrame(() => setActive(true));
		} else if (!tooltip.visible && shouldRender) {
			setActive(false);
			// Wait for animation to finish before unmounting
			const timeout = setTimeout(() => setShouldRender(false), 180);
			return () => clearTimeout(timeout);
		}
	}, [tooltip.visible, tooltip.text, tooltip.rect]);
	if (!shouldRender) return null;
	return ReactDOM.createPortal(
		<div
			className={`app-tooltip app-tooltip--${placement}`}
			style={{
				top,
				left,
				maxWidth: width,
				width: "max-content",
				transform: `${active ? `translate(-50%,0) scale(1)` : `translate(-50%,8px) scale(0.95)`}`,
				opacity: active ? 0.98 : 0,
				transition: "opacity 0.22s cubic-bezier(.4,0,.2,1), transform 0.22s cubic-bezier(.4,0,.2,1)",
				position: "fixed",
				pointerEvents: "none",
			}}
			data-active={active}
		>
			{tooltip.text}
			<span className="app-tooltip-arrow" />
		</div>,
		document.body
	);
}
