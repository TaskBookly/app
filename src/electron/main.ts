import { app, BrowserWindow, Menu, ipcMain } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import path from "path";

import { isDev } from "./util.js";
import { getPreloadPath } from "./pathResolver.js";

let sidebarCollapsed: boolean = false;

app.on("ready", () => {
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
	}

	ipcMain.on("toggle-sidebar", () => {
		sidebarCollapsed = !sidebarCollapsed;
		mainWindow.webContents.send("sidebar-state", sidebarCollapsed);
	});

	ipcMain.handle("get-sidebar-state", () => {
		return sidebarCollapsed;
	});

	if (isDev()) {
		mainWindow.loadURL("http://localhost:5123");
	} else {
		mainWindow.loadFile(path.join(app.getAppPath(), "/dist-react/index.html"));
	}
});
