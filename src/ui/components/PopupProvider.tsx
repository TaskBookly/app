import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { Context, ReactNode } from "react";
import Popup, { type PopupAction, type PopupInput, type PopupValues } from "./Popup";

export interface PopupOpenOptions {
	title: string;
	message?: ReactNode;
	inputs?: PopupInput[];
	actions: PopupAction[];
	dismissible?: boolean;
	initialValues?: Partial<PopupValues>;
	onAction?: (actionId: string, values: PopupValues) => void;
	onDismiss?: () => void;
}

export interface PopupResult {
	actionId: string;
	values: PopupValues;
}

export const POPUP_RESULT_DISMISSED = "__dismissed";

export interface PopupConfirmOptions {
	title: string;
	message?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmIcon?: PopupAction["icon"];
	cancelIcon?: PopupAction["icon"];
	intent?: PopupAction["intent"];
	dismissible?: boolean;
}

interface PopupController {
	open: (options: PopupOpenOptions) => Promise<PopupResult>;
	closeAll: () => void;
	confirm: (options: PopupConfirmOptions) => Promise<boolean>;
}

interface PopupInstance {
	id: string;
	open: boolean;
	options: PopupOpenOptions;
}

const globalPopupContextKey = "__taskbookly_popup_context__" as const;
type PopupContextGlobal = typeof globalThis & {
	[globalPopupContextKey]?: Context<PopupController | null>;
};

const PopupContext = (() => {
	const scope = globalThis as PopupContextGlobal;
	if (!scope[globalPopupContextKey]) {
		scope[globalPopupContextKey] = createContext<PopupController | null>(null);
	}
	return scope[globalPopupContextKey]!;
})();

const generateId = () => {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
	return Math.random().toString(36).slice(2);
};

interface PopupProviderProps {
	children?: ReactNode;
}

const PopupProvider = ({ children }: PopupProviderProps) => {
	const [instances, setInstances] = useState<PopupInstance[]>([]);
	const resolversRef = useRef(new Map<string, (result: PopupResult) => void>());
	const closeResultsRef = useRef(new Map<string, PopupResult>());

	const requestClose = useCallback((id: string, result?: PopupResult) => {
		if (closeResultsRef.current.has(id)) return;
		closeResultsRef.current.set(id, result ?? { actionId: POPUP_RESULT_DISMISSED, values: {} });
		setInstances((prev) => prev.map((inst) => (inst.id === id ? { ...inst, open: false } : inst)));
	}, []);

	const finalize = useCallback((id: string) => {
		setInstances((prev) => prev.filter((inst) => inst.id !== id));
		const resolver = resolversRef.current.get(id);
		const result = closeResultsRef.current.get(id) ?? { actionId: POPUP_RESULT_DISMISSED, values: {} };
		if (resolver) {
			resolver(result);
		}
		resolversRef.current.delete(id);
		closeResultsRef.current.delete(id);
	}, []);

	const open = useCallback((options: PopupOpenOptions) => {
		const id = generateId();
		return new Promise<PopupResult>((resolve) => {
			resolversRef.current.set(id, resolve);
			closeResultsRef.current.delete(id);
			setInstances((prev) => [...prev, { id, open: true, options }]);
		});
	}, []);

	const closeAll = useCallback(() => {
		instances.forEach((inst) => {
			requestClose(inst.id, { actionId: POPUP_RESULT_DISMISSED, values: {} });
		});
	}, [instances, requestClose]);

	const confirm = useCallback(
		async (options: PopupConfirmOptions) => {
			const result = await open({
				title: options.title,
				message: options.message,
				dismissible: options.dismissible ?? true,
				actions: [
					{
						id: "cancel",
						label: options.cancelLabel ?? "Cancel",
						intent: "neutral",
						icon: options.cancelIcon,
					},
					{
						id: "confirm",
						label: options.confirmLabel ?? "Confirm",
						intent: options.intent ?? "danger",
						icon: options.confirmIcon,
					},
				],
			});
			return result.actionId === "confirm";
		},
		[open]
	);

	const controller = useMemo<PopupController>(() => ({ open, closeAll, confirm }), [open, closeAll, confirm]);

	return (
		<PopupContext.Provider value={controller}>
			{children}
			{instances.map((inst) => {
				const { options, id } = inst;
				return (
					<Popup
						key={id}
						open={inst.open}
						title={options.title}
						message={options.message}
						inputs={options.inputs}
						actions={options.actions}
						initialValues={options.initialValues}
						dismissible={options.dismissible}
						onAction={(actionId, values) => {
							options.onAction?.(actionId, values);
							const action = options.actions.find((act) => act.id === actionId);
							if (!action || action.closeOnTrigger !== false) {
								requestClose(id, { actionId, values });
							}
						}}
						onDismiss={() => {
							options.onDismiss?.();
							requestClose(id, { actionId: POPUP_RESULT_DISMISSED, values: {} });
						}}
						onExitComplete={() => finalize(id)}
					/>
				);
			})}
		</PopupContext.Provider>
	);
};

export const usePopup = () => {
	const ctx = useContext(PopupContext);
	if (!ctx) {
		throw new Error("usePopup must be used within a PopupProvider");
	}
	return ctx;
};

export { PopupProvider };
