import { app, BrowserWindow, Menu, ipcMain, type MenuItemConstructorOptions, Notification, shell } from "electron";

import path from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";

import { isDev } from "./utils.js";
import { getPreloadPath } from "./pathResolver.js";

import FocusTimer from "./focus.js";

import electronUpdPkg from "electron-updater";
const { autoUpdater } = electronUpdPkg;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json to get version (go up from dist-electron to project root)
const packagePath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const appVersion = packageJson.version;

const settingsPath = path.join(app.getPath("userData"), "settings.json");

function loadSettings(): Record<string, string> {
	try {
		if (existsSync(settingsPath)) {
			return JSON.parse(readFileSync(settingsPath, "utf8"));
		}
	} catch (error) {
		console.error("Error loading settings:", error);
	}
	return {};
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
	const getPrimaryAction = () => {
		switch (focusTimer.status) {
			case "paused":
				return {
					label: "Resume",
					action: "resume",
					accelerator: "Option+Command+P",
					click: () => focusTimer.resume(),
				};
			case "counting":
				return {
					label: "Pause",
					action: "pause",
					accelerator: "Option+Command+P",
					click: () => focusTimer.pause(),
					enabled: focusTimer.session === "work",
				};
			default:
				return {
					label: "Start",
					action: "start",
					accelerator: "Option+Command+S",
					click: () => focusTimer.start(),
				};
		}
	};

	const primaryAction = getPrimaryAction();

	return {
		label: "Focus",
		submenu: [
			{
				type: "normal",
				label: primaryAction.label,
				accelerator: primaryAction.accelerator,
				enabled: primaryAction.enabled !== false,
				click: primaryAction.click,
			},
			...(focusTimer.status !== "stopped"
				? [
						{
							type: "normal" as const,
							label: "Stop",
							accelerator: "Option+Command+X",
							click: () => focusTimer.stop(),
						},
				  ]
				: []),
			...(focusTimer.session === "break" && (focusTimer.status === "counting" || focusTimer.status === "paused")
				? [
						{ type: "separator" as const },
						{
							type: "normal" as const,
							label: "Charge break",
							enabled: !focusTimer.chargeUsedThisSession || focusTimer.chargesLeft > 0,
						},
				  ]
				: []),
			...(focusTimer.session === "work"
				? [
						{ type: "separator" as const },
						{
							type: "submenu" as const,
							label: "Add Time",
							submenu: [
								{
									type: "normal" as const,
									label: "1 Minute",
									click: () => focusTimer.addTime(60),
								},
								{
									type: "normal" as const,
									label: "2 Minutes",
									click: () => focusTimer.addTime(120),
								},
								{
									type: "normal" as const,
									label: "3 Minutes",
									click: () => focusTimer.addTime(180),
								},
								{
									type: "normal" as const,
									label: "4 Minutes",
									click: () => focusTimer.addTime(240),
								},
								{
									type: "normal" as const,
									label: "5 Minutes",
									click: () => focusTimer.addTime(300),
								},
								{
									type: "normal" as const,
									label: "10 Minutes",
									click: () => focusTimer.addTime(600),
								},
							],
						},
				  ]
				: []),
		],
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
			{
				role: "windowMenu",
			},
			// Debug menu for development environment
			...(isDev()
				? [
						{
							label: "Debug",
							submenu: [{ role: "reload" as const }, { role: "forceReload" as const }, { type: "separator" as const }, { role: "toggleDevTools" as const }],
						},
				  ]
				: []),
			{
				role: "help",
				submenu: [{ type: "header", label: "Socials" }, { type: "normal", label: "GitHub", click: () => shell.openExternal("https://github.com/TaskBookly") }, { type: "separator" }, { type: "normal", label: "Acknowledgements", click: () => shell.openExternal("https://github.com/TaskBookly/app?tab=readme-ov-file#-acknowledgements") }],
			},
		];

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
		app.setLoginItemSettings({
			openAtLogin: true,
			name: "TaskBookly",
		});
	}

	if (settings.autoCheckForUpdates === "true") {
		autoUpdater.checkForUpdates();
	}

	mainWindow = new BrowserWindow({
		title: "TaskBookly",
		webPreferences: {
			preload: getPreloadPath(),
			devTools: isDev(),
			nodeIntegration: false, // Disable Node.js integration in renderer
			contextIsolation: true, // Enable context isolation
			webSecurity: true, // Enable web security
			allowRunningInsecureContent: false, // Prevent insecure content
			experimentalFeatures: false, // Disable experimental web features
		},
		minWidth: 500,
		minHeight: 250,
		autoHideMenuBar: true, // Hide the default menu bar
		titleBarStyle: "hiddenInset",
		backgroundColor: "#0a3f4f",
	});

	focusTimer = new FocusTimer(mainWindow, loadSettings());

	// Listen for timer updates and forward to renderer
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

	ipcMain.on("focus-add-time", (_, seconds: number) => {
		focusTimer.addTime(seconds);
	});

	ipcMain.handle("focus-use-charge", () => {
		return focusTimer.useBreakCharge();
	});

	autoUpdater.on("update-available", (data) => {
		if (Notification.isSupported()) {
			const notif = new Notification({
				title: "Update Available",
				subtitle: `v${data.version}`,
				body: "A new TaskBookly update is available to download.",
				silent: true,
			});

			notif.on("click", () => shell.openExternal("https://github.com/TaskBookly/app/releases/latest"));
			notif.show();
			mainWindow.webContents.send("play-sound", "notifs/info.ogg");
		}
	});

	autoUpdater.on("update-not-available", () => {
		if (Notification.isSupported()) {
			const notif = new Notification({
				title: "No updates available",
				body: "You're all up to date!",
				silent: true,
			});
			notif.show();
			mainWindow.webContents.send("play-sound", "notifs/info.ogg");
		}
	});

	autoUpdater.on("error", (err) => {
		const notif = new Notification({
			title: "An error occurred when checking for updates",
			subtitle: err.name,
			body: err.message,
			silent: true,
		});

		notif.show();
		mainWindow.webContents.send("play-sound", "notifs/error.ogg");
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
		const settings = loadSettings();
		settings[key] = value;
		saveSettings(settings);

		FocusTimer.updateSettings(settings);

		if (key === "launchOnLogin" && process.platform !== "darwin") {
			const launchOnLogin = value === "true";
			try {
				app.setLoginItemSettings({
					openAtLogin: launchOnLogin,
					name: "TaskBookly",
				});
			} catch (e) {
				console.error("Unable to set login item:", e);
			}
		}

		return true;
	});

	if (isDev()) {
		mainWindow.loadURL("http://localhost:5123");
	} else {
		mainWindow.loadFile(path.join(app.getAppPath(), "/dist-react/index.html"));
	}

	updateMenu();
});
