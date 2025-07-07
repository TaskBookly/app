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
	},
	focus: {
		start: () => ipcRenderer.send("focus-start"),
		pause: () => ipcRenderer.send("focus-pause"),
		resume: () => ipcRenderer.send("focus-resume"),
		stop: () => ipcRenderer.send("focus-stop"),
		addTime: (seconds: number) => ipcRenderer.send("focus-add-time", seconds),
		useBreakCharge: () => ipcRenderer.invoke("focus-use-charge"),
		onTimerUpdate: (callback) => {
			ipcRenderer.on("focus-timer-update", (_event: any, data: any) => callback(data));
			// Return cleanup function
			return () => ipcRenderer.removeAllListeners("focus-timer-update");
		},
	},
  settings: {
		load: () => ipcRenderer.invoke("settings-load"),
		get: (key: string) => ipcRenderer.invoke("settings-get", key),
		set: (key: string, value: string) => ipcRenderer.invoke("settings-set", key, value),
	},
	onJumpToSection: (callback) => {
		ipcRenderer.on("jumpto-section", (_event: any, section: string) => callback(section));
	},
} satisfies Window["electron"]);
