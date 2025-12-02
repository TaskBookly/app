import { app, BrowserWindow, Menu, ipcMain, type MenuItemConstructorOptions, Notification, dialog, shell, nativeTheme } from "electron";

import path from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

import { isDev } from "./utils.js";
import { getPreloadPath } from "./pathResolver.js";
import { getDefaultSettings } from "../common/settingsDefaults.js";

import FocusTimer from "./focus.js";
import FocusPresetStore from "./focusPresetStore.js";

import { getBuildInfo } from "./buildInfo.js";

import electronUpdPkg from "electron-updater";
import { startupDisRPC } from "./discordRPC.js";

const { autoUpdater } = electronUpdPkg;

if (process.platform === "win32") {
	app.setAppUserModelId("com.taskbookly.app");
}

const suppressedErrorCodes = new Set(["EIO", "EPIPE"]);
let hasShownMainProcessError = false;

function handleMainProcessError(source: "uncaughtException" | "unhandledRejection", error: unknown) {
	const err = error instanceof Error ? error : new Error(String(error));
	const nodeError = err as NodeJS.ErrnoException;
	if (nodeError.code && suppressedErrorCodes.has(nodeError.code)) {
		console.warn(`[main] Suppressed ${nodeError.code} from ${source}: ${err.message}`);
		return;
	}
	if (hasShownMainProcessError) {
		console.error(`[main] Additional ${source}:`, err);
		return;
	}
	hasShownMainProcessError = true;

	const showDialog = () => {
		dialog
			.showMessageBox({
				type: "error",
				title: "Unexpected Error",
				message: "TaskBookly encountered an unexpected error in the main process.",
				detail: err.stack ?? err.message,
				buttons: ["OK"],
			})
			.catch((dialogError) => {
				console.error("Failed to present error dialog", dialogError);
			});
	};

	if (app.isReady()) {
		showDialog();
	} else {
		app.once("ready", showDialog);
	}

	console.error(`[main] ${source}:`, err);
}

process.on("uncaughtException", (error) => {
	handleMainProcessError("uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
	handleMainProcessError("unhandledRejection", reason);
});

if (isDev()) {
	const simulatedCode = process.env.SIMULATE_MAIN_ERROR?.toUpperCase();
	if (simulatedCode) {
		process.nextTick(() => {
			const simulatedError = Object.assign(new Error(`Simulated main-process error (${simulatedCode})`), { code: simulatedCode });
			process.emit("uncaughtException", simulatedError);
		});
	}
}

export const appVersion: string = app.getVersion();

const settingsPath = path.join(app.getPath("userData"), "settings.json");

function loadSettings(): Record<string, string> {
	try {
		const defaultSettings = getDefaultSettings(process.platform);
		let loadedSettings: Record<string, string> = {};

		if (existsSync(settingsPath)) {
			try {
				loadedSettings = JSON.parse(readFileSync(settingsPath, "utf8"));
			} catch (error) {
				console.error("Error parsing settings file:", error);
			}
		}

		const cleanedSettings: Record<string, string> = {};
		for (const [key, defaultValue] of Object.entries(defaultSettings)) {
			cleanedSettings[key] = loadedSettings[key] !== undefined ? loadedSettings[key] : defaultValue;
		}

		saveSettings(cleanedSettings);

		return cleanedSettings;
	} catch (error) {
		console.error("Error loading settings:", error);
		return getDefaultSettings(process.platform);
	}
}

function saveSettings(settings: Record<string, string>): void {
	try {
		const userDataPath = app.getPath("userData");
		if (!existsSync(userDataPath)) {
			mkdirSync(userDataPath, { recursive: true });
		}
		writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
	} catch (error) {
		console.error("Error saving settings:", error);
	}
}

let sidebarCollapsed: boolean = false;

let mainWindow: BrowserWindow;
let focusTimer: FocusTimer;
let focusPresetStore: FocusPresetStore;
let allowWindowClose = false;
let pendingClosePrompt = false;

// Function to build the focus menu based on current state
function buildFocusMenu(): MenuItemConstructorOptions {
	const settings = loadSettings();
	const getPrimaryAction = () => {
		switch (focusTimer.status) {
			case "paused":
				return {
					label: "Resume",
					accelerator: "Option+Command+P",
					click: () => focusTimer.resume(),
				};
			case "counting":
				return {
					label: "Pause",
					accelerator: "Option+Command+P",
					click: () => focusTimer.pause(),
					enabled: focusTimer.session === "work",
				};
			default:
				return {
					label: "Start",
					accelerator: "Option+Command+S",
					click: () => focusTimer.start(),
				};
		}
	};

	const primaryAction = getPrimaryAction();
	const menuItems: MenuItemConstructorOptions[] = [
		{
			type: "normal",
			label: primaryAction.label,
			accelerator: primaryAction.accelerator,
			enabled: primaryAction.enabled !== false,
			click: primaryAction.click,
		},
	];

	if (focusTimer.status !== "stopped") {
		menuItems.push({
			type: "normal",
			label: "Stop",
			accelerator: "Option+Command+X",
			click: () => focusTimer.stop(),
		});
	}

	if (settings.breakChargingEnabled === "true" && focusTimer.session === "break" && (focusTimer.status === "counting" || focusTimer.status === "paused")) {
		menuItems.push(
			{ type: "separator" },
			{
				type: "normal",
				label: "Use Break Charge",
				enabled: !focusTimer.chargeUsedThisSession && focusTimer.chargesLeft > 0 && !focusTimer.isOnCooldown,
				click: () => focusTimer.useBreakCharge(),
			}
		);
	}

	if (focusTimer.session === "work") {
		menuItems.push(
			{ type: "separator" },
			{
				type: "submenu",
				label: "Add Time",
				submenu: [
					{ type: "normal", label: "1 Minute", click: () => focusTimer.addTime(60) },
					{ type: "normal", label: "2 Minutes", click: () => focusTimer.addTime(120) },
					{ type: "normal", label: "3 Minutes", click: () => focusTimer.addTime(180) },
					{ type: "normal", label: "4 Minutes", click: () => focusTimer.addTime(240) },
					{ type: "normal", label: "5 Minutes", click: () => focusTimer.addTime(300) },
					{ type: "normal", label: "10 Minutes", click: () => focusTimer.addTime(600) },
					{ type: "normal", label: "15 Minutes", click: () => focusTimer.addTime(900) },
					{ type: "normal", label: "20 Minutes", click: () => focusTimer.addTime(1200) },
				],
			}
		);
	}

	return {
		label: "Focus",
		submenu: menuItems,
	};
}

function updateMenu() {
	if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) {
		return;
	}
	if (process.platform === "darwin") {
		const menuTemplate: MenuItemConstructorOptions[] = [
			{
				label: app.name,
				submenu: [{ role: "about" }, { type: "separator" }, { label: "Settings...", accelerator: "Command+,", click: () => mainWindow.webContents.send("jumpto-section", "settings") }, { type: "separator" }, { role: "services" }, { type: "separator" }, { role: "hide" }, { role: "hideOthers" }, { role: "unhide" }, { type: "separator" }, { role: "quit" }],
			},
			{
				label: "Edit",
				submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }],
			},
			{
				label: "View",
				submenu: [
					{
						type: "normal",
						label: "Toggle Sidebar",
						accelerator: "Ctrl+Tab",
						click: () => {
							sidebarCollapsed = !sidebarCollapsed;
							mainWindow.webContents.send("sidebar-state", sidebarCollapsed);
						},
					},
					{ type: "separator" },
					{ role: "resetZoom" },
					{ role: "zoomIn" },
					{ role: "zoomOut" },
					{ type: "separator" },
					{ role: "togglefullscreen" },
				],
			},
			buildFocusMenu(),
			{ role: "windowMenu" },
		];

		if (isDev()) {
			menuTemplate.push({
				label: "Debug",
				submenu: [{ role: "reload" }, { role: "forceReload" }, { type: "separator" }, { role: "toggleDevTools" }, { type: "separator" }, { type: "submenu", label: "More Options", submenu: [{ type: "normal", label: "Crash Renderer", click: () => mainWindow.webContents.forcefullyCrashRenderer() }] }],
			});
		}

		menuTemplate.push({
			role: "help",
			submenu: [{ type: "header", label: "Socials" }, { type: "normal", label: "GitHub", click: () => shell.openExternal("https://github.com/TaskBookly") }, { type: "separator" }, { type: "normal", label: "Report an Issue...", click: () => shell.openExternal("https://github.com/TaskBookly/app/issues/new") }, { type: "normal", label: "Acknowledgments", click: () => shell.openExternal("https://taskbookly.framer.website/acknowledgments") }],
		});

		const menu = Menu.buildFromTemplate(menuTemplate);
		Menu.setApplicationMenu(menu);
	} else {
		Menu.setApplicationMenu(null);
	}
}

app.whenReady().then(() => {
	autoUpdater.autoDownload = false;
	const buildInfo = getBuildInfo();
	const updaterChannel = buildInfo.channel === "stable" ? "latest" : buildInfo.channel;
	autoUpdater.allowPrerelease = buildInfo.channel !== "stable";
	autoUpdater.channel = updaterChannel;

	focusPresetStore = new FocusPresetStore();
	const settings = loadSettings();

	if (!isDev() && buildInfo.channel === "stable") {
		autoUpdater.checkForUpdates();
	}

	startupDisRPC();

	mainWindow = new BrowserWindow({
		title: "TaskBookly",
		webPreferences: {
			preload: getPreloadPath(),
			devTools: isDev(),
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: true,
			allowRunningInsecureContent: false,
			experimentalFeatures: false,
		},
		minWidth: 600,
		minHeight: 500,
		autoHideMenuBar: true,
		frame: false,
		titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
		backgroundColor: "#000000",
		fullscreenable: false,
	});

	const initialPreset = focusPresetStore.getSelectedPreset();
	focusTimer = new FocusTimer(mainWindow, settings, initialPreset);

	focusTimer.forceDataUpdate();

	mainWindow.on("close", (event) => {
		if (allowWindowClose) {
			allowWindowClose = false;
			return;
		}

		const shouldConfirmClose = Boolean(focusTimer) && focusTimer.status !== "stopped";
		const hasRenderer = mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed();
		if (!shouldConfirmClose || !hasRenderer) {
			return;
		}

		event.preventDefault();
		if (pendingClosePrompt) {
			return;
		}
		pendingClosePrompt = true;

		mainWindow.show();
		mainWindow.webContents.send("window-close-requested");
	});

	focusTimer.on("timer-update", (eventType, data) => {
		const hasRenderer = mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed();
		if (!hasRenderer) {
			return;
		}
		if (eventType !== "tick") {
			updateMenu();
		}
		mainWindow.webContents.send("focus-timer-update", data);
	});

	ipcMain.on("focus-start", () => {
		focusTimer.start();
	});

	ipcMain.on("focus-pause", () => {
		focusTimer.pause();
	});

	ipcMain.on("focus-resume", () => {
		focusTimer.resume();
	});

	ipcMain.on("focus-stop", () => {
		focusTimer.stop();
	});

	ipcMain.on("focus-request-data-update", () => {
		focusTimer.forceDataUpdate();
	});

	ipcMain.on("focus-add-time", (_, seconds: number) => {
		focusTimer.addTime(seconds);
	});

	ipcMain.handle("focus-use-charge", () => {
		return focusTimer.useBreakCharge();
	});

	ipcMain.handle("open-userdata", () => {
		const userDataPath = app.getPath("userData");
		shell.openPath(userDataPath);
	});

	ipcMain.handle("sys-theme", () => {
		return nativeTheme.shouldUseDarkColors ? "dark" : "light";
	});

	ipcMain.on("open-shell-url", (_, url) => {
		shell.openExternal(url);
	});

	nativeTheme.on("updated", () => {
		mainWindow.webContents.send("sys-theme-changed", nativeTheme.shouldUseDarkColors ? "dark" : "light");
	});

	autoUpdater.on("update-available", (data) => {
		if (Notification.isSupported()) {
			const notif = new Notification({
				title: "Update Available",
				subtitle: `v${data.version}`,
				body: "A new TaskBookly update is available to download!",
				silent: true,
			});

			notif.on("click", () => shell.openExternal("https://taskbookly.framer.website/download"));
			notif.show();
			mainWindow.webContents.send("play-sound", "notifs/info.ogg");
		}
	});

	ipcMain.on("toggle-sidebar", () => {
		sidebarCollapsed = !sidebarCollapsed;
		mainWindow.webContents.send("sidebar-state", sidebarCollapsed);
	});

	ipcMain.handle("get-sidebar-state", () => {
		return sidebarCollapsed;
	});

	ipcMain.handle("get-app-version", () => {
		return appVersion;
	});

	ipcMain.handle("get-build-info", () => {
		return buildInfo;
	});

	ipcMain.handle("get-node-env", () => {
		return process.env.NODE_ENV || "production";
	});

	ipcMain.handle("get-platform", () => {
		return process.platform;
	});

	ipcMain.handle("get-electron-version", () => {
		return process.versions.electron || "unknown";
	});

	ipcMain.handle("get-chrome-version", () => {
		return process.versions.chrome || process.versions.v8 || "unknown";
	});

	ipcMain.handle("settings-load", () => {
		return loadSettings();
	});

	ipcMain.handle("settings-get", (_event, key: string) => {
		const settings = loadSettings();
		return settings[key] || "";
	});

	ipcMain.handle("settings-set", (_event, key: string, value: string) => {
		const defaultSettings = getDefaultSettings(process.platform);

		if (!(key in defaultSettings)) {
			console.warn(`Attempted to set unknown setting: ${key}`);
			return false;
		}

		const settings = loadSettings();
		settings[key] = value;
		saveSettings(settings);

		FocusTimer.updateSettings(settings);

		// Force data update when break charge related settings change
		if (key === "breakChargingEnabled" || key === "workTimePerCharge" || key === "breakChargeExtensionAmount" || key === "breakChargeCooldown") {
			focusTimer.forceDataUpdate();
		}

		return true;
	});

	const getPresetPayload = () => ({
		presets: focusPresetStore.getPresets(),
		selectedPresetId: focusPresetStore.getSelectedPresetId(),
	});

	ipcMain.handle("focus-presets-list", () => {
		return getPresetPayload();
	});

	ipcMain.handle("focus-presets-create", (_event, preset: { name: string; workDurationMinutes: number; breakDurationMinutes: number; description?: string }) => {
		return focusPresetStore.createPreset(preset);
	});

	ipcMain.handle("focus-presets-update", (_event, presetId: string, payload: { name: string; workDurationMinutes: number; breakDurationMinutes: number; description?: string }) => {
		const updated = focusPresetStore.updatePreset(presetId, payload);
		if (updated && focusPresetStore.getSelectedPresetId() === presetId) {
			FocusTimer.setActivePreset(updated);
			focusTimer.forceDataUpdate();
		}
		return updated;
	});

	ipcMain.handle("focus-presets-delete", (_event, presetId: string) => {
		const result = focusPresetStore.deletePreset(presetId);
		if (result) {
			const activePreset = focusPresetStore.getSelectedPreset();
			FocusTimer.setActivePreset(activePreset);
			focusTimer.forceDataUpdate();
		}
		return result;
	});

	ipcMain.handle("focus-presets-set-active", (_event, presetId: string) => {
		const preset = focusPresetStore.setSelectedPreset(presetId);
		FocusTimer.setActivePreset(preset);
		focusTimer.forceDataUpdate();
		return { selectedPresetId: preset.id };
	});

	// Window control handlers
	ipcMain.on("window-minimize", () => {
		mainWindow.minimize();
	});

	ipcMain.on("window-maximize", () => {
		if (mainWindow.isMaximized()) {
			mainWindow.restore();
		} else {
			mainWindow.maximize();
		}
	});

	ipcMain.on("window-close", () => {
		mainWindow.close();
	});

	ipcMain.handle("window-is-maximized", () => {
		return mainWindow.isMaximized();
	});

	ipcMain.handle("window-close-decision", (_event, shouldClose: boolean) => {
		pendingClosePrompt = false;
		if (!mainWindow || mainWindow.isDestroyed()) {
			return false;
		}
		if (shouldClose) {
			allowWindowClose = true;
			mainWindow.close();
		}
		return shouldClose;
	});

	// Listen for window state changes
	mainWindow.on("maximize", () => {
		mainWindow.webContents.send("window-state-changed", { maximized: true });
	});

	mainWindow.on("unmaximize", () => {
		mainWindow.webContents.send("window-state-changed", { maximized: false });
	});

	mainWindow.webContents.on("render-process-gone", async (_, error) => {
		promptProcessFailure(error);
	});

	app.on("child-process-gone", async (_, error) => {
		promptProcessFailure(error);
	});

	if (isDev()) {
		mainWindow.loadURL("http://localhost:5123");
	} else {
		mainWindow.loadFile(path.join(app.getAppPath(), "/dist-react/index.html"));
	}

	updateMenu();
});

app.on("window-all-closed", () => {
	if (focusTimer) {
		focusTimer.dispose();
	}
	app.quit();
});

async function promptProcessFailure(error: Electron.Details | Electron.RenderProcessGoneDetails) {
	const { response } = await dialog.showMessageBox({
		type: "error",
		message: "This is.. awkward",
		detail: `
			TaskBookly encountered a fatal error and crashed :(
			Reason: ${error.reason} (Exit Code: ${error.exitCode})

			If you continue to encounter this error, please open a new Issue on our GitHub Repository
			`,
		title: "Fatal Error",
		buttons: ["Restart", "Close & Open Issue...", "Close"],
		cancelId: 2,
	});
	if (response === 0) {
		app.relaunch();
	} else if (response === 1) {
		shell.openExternal("https://github.com/TaskBookly/app/issues/new");
	}
	app.quit();
}
