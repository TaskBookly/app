import { app, BrowserWindow, Menu, ipcMain, type MenuItemConstructorOptions, Notification, dialog, shell } from "electron";

import path from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";

import { isDev } from "./utils.js";
import { getPreloadPath } from "./pathResolver.js";
import { getDefaultSettings } from "./settings.js";

import FocusTimer from "./focus.js";

import electronUpdPkg from "electron-updater";
const { autoUpdater } = electronUpdPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packagePath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const appVersion = packageJson.version;

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
			submenu: [{ type: "header", label: "Socials" }, { type: "normal", label: "GitHub", click: () => shell.openExternal("https://github.com/TaskBookly") }, { type: "separator" }, { type: "normal", label: "Report an Issue...", click: () => shell.openExternal("https://github.com/TaskBookly/app/issues/new") }, { type: "normal", label: "Acknowledgements", click: () => shell.openExternal("https://github.com/TaskBookly/app?tab=readme-ov-file#-acknowledgements") }],
		});

		const menu = Menu.buildFromTemplate(menuTemplate);
		Menu.setApplicationMenu(menu);
	} else {
		Menu.setApplicationMenu(null);
	}
}

app.whenReady().then(() => {
	autoUpdater.autoDownload = false;
	const settings = loadSettings();

	if (settings.launchOnLogin === "true") {
		mainWindow.minimize();
	}

	if (settings.autoCheckForUpdates === "true") {
		autoUpdater.checkForUpdates();
	}

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

	focusTimer = new FocusTimer(mainWindow, settings);

	focusTimer.forceDataUpdate();

	focusTimer.on("timer-update", (eventType, data) => {
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

	autoUpdater.on("update-available", (data) => {
		if (Notification.isSupported()) {
			const notif = new Notification({
				title: "Update Available",
				subtitle: `v${data.version}`,
				body: "A new TaskBookly update is available to download!",
				silent: true,
			});

			notif.on("click", () => shell.openExternal("https://github.com/TaskBookly/app/releases/latest"));
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

	ipcMain.handle("get-node-env", () => {
		return process.env.NODE_ENV || "production";
	});

	ipcMain.handle("get-platform", () => {
		return process.platform;
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

		if (key === "launchOnLogin" && process.platform !== "darwin") {
			const launchOnLogin = value === "true";
			try {
				app.setLoginItemSettings({
					openAtLogin: launchOnLogin,
				});
			} catch (e) {
				console.error("Unable to set login item:", e);
			}
		}

		return true;
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

	// Listen for window state changes
	mainWindow.on("maximize", () => {
		mainWindow.webContents.send("window-state-changed", { maximized: true });
	});

	mainWindow.on("unmaximize", () => {
		mainWindow.webContents.send("window-state-changed", { maximized: false });
	});

	mainWindow.webContents.on("render-process-gone", async (_, error) => {
		const { response } = await dialog.showMessageBox({
			type: "error",
			message: "This is.. awkward",
			detail: `
			TaskBookly encountered a fatal error and crashed :(
			Reason: ${error.reason} (Exit Code: ${error.exitCode})

			If you continue to encounter this error, please open a new Issue on our GitHub Repository
			`,
			title: "Fatal Error",
			buttons: ["Reload", "Open Issue...", "Close"],
			cancelId: 2,
		});
		if (response === 0) {
			mainWindow.webContents.reload();
		} else if (response === 1) {
			shell.openExternal("https://github.com/TaskBookly/app/issues/new");
		} else if (response === 2) {
			app.quit();
		}
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
		const secretDataManager = (focusTimer as any).secretDataManager;
		if (secretDataManager?.cleanup) {
			secretDataManager.cleanup();
		}
	}
	app.quit();
});

const handleExit = () => process.exit(0);
process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);
