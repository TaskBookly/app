const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
	sidebar: {
		toggle: () => ipcRenderer.send("toggle-sidebar"),
		getState: () => ipcRenderer.invoke("get-sidebar-state"),
		onState: (callback) => {
			ipcRenderer.on("sidebar-state", (_event: any, collapsed: boolean) => callback(collapsed));
		},
	},
	build: {
		getVersion: () => ipcRenderer.invoke("get-app-version"),
		getNodeEnv: () => ipcRenderer.invoke("get-node-env"),
		getPlatform: () => ipcRenderer.invoke("get-platform"),
		getElectronVersion: () => ipcRenderer.invoke("get-electron-version"),
		getChromeVersion: () => ipcRenderer.invoke("get-chrome-version"),
	},
	focus: {
		start: () => ipcRenderer.send("focus-start"),
		pause: () => ipcRenderer.send("focus-pause"),
		resume: () => ipcRenderer.send("focus-resume"),
		stop: () => ipcRenderer.send("focus-stop"),
		addTime: (seconds: number) => ipcRenderer.send("focus-add-time", seconds),
		useBreakCharge: () => ipcRenderer.invoke("focus-use-charge"),
		requestDataUpdate: () => ipcRenderer.send("focus-request-data-update"),
		onTimerUpdate: (callback) => {
			ipcRenderer.on("focus-timer-update", (_event: any, data: any) => callback(data));
			// Return cleanup function
			return () => ipcRenderer.removeAllListeners("focus-timer-update");
		},
	},
	sound: {
		onplaySound: (callback) => ipcRenderer.on("play-sound", (_event: any, soundPath: string) => callback(soundPath)),
	},
	system: {
		getTheme: () => ipcRenderer.invoke("sys-theme"),
		onThemeChange: (callback) => {
			ipcRenderer.on("sys-theme-changed", (_event: any, theme: string) => callback(theme));
			// Return cleanup function
			return () => ipcRenderer.removeAllListeners("sys-theme-changed");
		},
	},
	settings: {
		load: () => ipcRenderer.invoke("settings-load"),
		get: (key: string) => ipcRenderer.invoke("settings-get", key),
		set: (key: string, value: string) => ipcRenderer.invoke("settings-set", key, value),
	},
	window: {
		minimize: () => ipcRenderer.send("window-minimize"),
		maximize: () => ipcRenderer.send("window-maximize"),
		close: () => ipcRenderer.send("window-close"),
		isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
		onStateChanged: (callback: (state: { maximized: boolean }) => void) => {
			ipcRenderer.on("window-state-changed", (_event: any, state: { maximized: boolean }) => callback(state));
		},
	},
	onJumpToSection: (callback) => ipcRenderer.on("jumpto-section", (_event: any, section: string) => callback(section)),
	openUserData: () => ipcRenderer.invoke("open-userdata"),
	openShellURL: (url: string) => ipcRenderer.send("open-shell-url", url),
} satisfies Window["electron"]);
