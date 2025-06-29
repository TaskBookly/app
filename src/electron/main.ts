import { app, BrowserWindow, Menu, ipcMain } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

import { isDev } from "./util.js";
import { getPreloadPath } from "./pathResolver.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json to get version (go up from dist-electron to project root)
const packagePath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const appVersion = packageJson.version;

let sidebarCollapsed: boolean = false;

// Focus timer state
let focusTimerState = {
	status: "stopped" as "counting" | "paused" | "stopped",
	session: "work" as "work" | "break" | "transition",
	timeLeft: 0,
	canAddTime: false,
};

// Function to build the focus menu based on current state
function buildFocusMenu(mainWindow: BrowserWindow): MenuItemConstructorOptions {
	const getPrimaryAction = () => {
		switch (focusTimerState.status) {
			case "paused":
				return { label: "Resume", action: "resume", accelerator: "Option+Command+R" };
			case "counting":
				return { label: "Pause", action: "pause", accelerator: "Option+Command+R", enabled: focusTimerState.session === "work" };
			case "stopped":
			default:
				return { label: "Start", action: "start", accelerator: "Option+Command+S" };
		}
	};

	const getStatusDisplay = () => {
		if (focusTimerState.status === "counting" || focusTimerState.status === "paused") {
			const minutes = Math.floor(focusTimerState.timeLeft / 60);
			const seconds = focusTimerState.timeLeft % 60;
			const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
			const sessionType = focusTimerState.session === "work" ? "Working" : "Taking a break";
			return focusTimerState.status === "paused" ? `${sessionType} • ${timeStr} ⏸` : `${sessionType} • ${timeStr}`;
		}

		return "Focus";
	};

	const primaryAction = getPrimaryAction();
	const statusDisplay = getStatusDisplay();

	return {
		label: statusDisplay,
		submenu: [
			{
				type: "normal",
				label: primaryAction.label,
				accelerator: primaryAction.accelerator,
				enabled: primaryAction.enabled !== false,
				click: () => mainWindow.webContents.send("focus-action", primaryAction.action),
			},
			...(focusTimerState.status !== "stopped"
				? [
						{
							type: "normal" as const,
							label: "Stop",
							accelerator: "Option+Command+X",
							click: () => mainWindow.webContents.send("focus-action", "stop"),
						},
				  ]
				: []),
			...(focusTimerState.session === "break" && (focusTimerState.status === "counting" || focusTimerState.status === "paused")
				? [
						{ type: "separator" as const },
						{
							type: "normal" as const,
							label: "Use break charge",
						},
				  ]
				: []),
			...(focusTimerState.canAddTime
				? [
						{ type: "separator" as const },
						{
							type: "submenu" as const,
							label: "Add Time",
							submenu: [
								{
									type: "normal" as const,
									label: "1 Minute",
									click: () => mainWindow.webContents.send("focus-action", "add-time", 1),
								},
								{
									type: "normal" as const,
									label: "2 Minutes",
									click: () => mainWindow.webContents.send("focus-action", "add-time", 2),
								},
								{
									type: "normal" as const,
									label: "5 Minutes",
									click: () => mainWindow.webContents.send("focus-action", "add-time", 5),
								},
								{
									type: "normal" as const,
									label: "10 Minutes",
									click: () => mainWindow.webContents.send("focus-action", "add-time", 10),
								},
							],
						},
				  ]
				: []),
		],
	};
}

// Function to update the menu
function updateMenu(mainWindow: BrowserWindow) {
	if (process.platform !== "darwin") return;

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
		buildFocusMenu(mainWindow),
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
}

app.whenReady().then(() => {
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
		updateMenu(mainWindow);
	}

	// IPC handlers for focus timer status updates
	ipcMain.on("focus-status-update", (_, status, session, timeLeft) => {
		focusTimerState.status = status;
		focusTimerState.session = session;
		focusTimerState.timeLeft = timeLeft;
		focusTimerState.canAddTime = session === "work" && status !== "stopped";
		updateMenu(mainWindow);
	});

	// IPC handlers for focus timer actions
	ipcMain.on("focus-start", () => {
		mainWindow.webContents.send("focus-action", "start");
	});

	ipcMain.on("focus-pause", () => {
		mainWindow.webContents.send("focus-action", "pause");
	});

	ipcMain.on("focus-resume", () => {
		mainWindow.webContents.send("focus-action", "resume");
	});

	ipcMain.on("focus-stop", () => {
		mainWindow.webContents.send("focus-action", "stop");
	});

	ipcMain.on("focus-add-time", (_, minutes: number) => {
		mainWindow.webContents.send("focus-action", "add-time", minutes);
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

	ipcMain.handle("get-chrome-version", () => {
		return process.versions.chrome;
	});

	if (isDev()) {
		mainWindow.loadURL("http://localhost:5123");
	} else {
		mainWindow.loadFile(path.join(app.getAppPath(), "/dist-react/index.html"));
	}
});
