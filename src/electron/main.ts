import { app, BrowserWindow, Menu, ipcMain } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import path from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";

import { isDev } from "./utils.js";
import { getPreloadPath } from "./pathResolver.js";

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

app.on("ready", () => {
	const settings = loadSettings();

	if (settings.launchOnLogin === "true") {
		app.setLoginItemSettings({
			openAtLogin: true,
			name: "TaskBookly",
		});
	}

	const mainWindow = new BrowserWindow({
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

	// MacOS Menu bar
	if (process.platform === "darwin") {
		const menuTemplate: MenuItemConstructorOptions[] = [
			{
				label: app.name,
				submenu: [{ role: "about" }, { type: "separator" }, { label: "Settings...", accelerator: "Command+,", click: () => mainWindow.webContents.send("jumpto-section", "settings") }, { type: "separator" }, { role: "services" }, { type: "separator" }, { role: "hide" }, { role: "hideOthers" }, { role: "unhide" }, { type: "separator" }, { role: "quit" }],
			},
			{
				label: "File",
				submenu: [{ label: "New Task...", accelerator: "Command+T" }],
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
			{
				label: "Focus",
				submenu: [
					{ type: "normal", label: "Pause", accelerator: "Option+Command+P" },
					{ type: "normal", label: "Stop", accelerator: "Option+Command+S" },
					{ type: "separator" },
					{
						type: "submenu",
						label: "Add Time",
						submenu: [
							{ type: "normal", label: "1 Minute" },
							{ type: "normal", label: "5 Minutes" },
							{ type: "normal", label: "10 Minutes" },
							{ type: "normal", label: "15 Minutes" },
							{ type: "normal", label: "30 Minutes" },
							{ type: "normal", label: "1 Hour" },
						],
					},
					{ type: "normal", label: "Next Period" },
				],
			},
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
		];
		const menu = Menu.buildFromTemplate(menuTemplate);
		Menu.setApplicationMenu(menu);
	} else {
		Menu.setApplicationMenu(null);
	}

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
});
