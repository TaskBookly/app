const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
	sidebar: {
		toggle: () => ipcRenderer.send("toggle-sidebar"),
		getState: () => ipcRenderer.invoke("get-sidebar-state"),
		onState: (callback: (collapsed: boolean) => void) => {
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
		useBreakCharge: () => ipcRenderer.handle("focus-use-charge"),
		onTimerUpdate: (callback: (data: any) => void) => {
			ipcRenderer.on("focus-timer-update", (_event: any, data: any) => callback(data));
			// Return cleanup function
			return () => ipcRenderer.removeAllListeners("focus-timer-update");
		},
	},
	onJumpToSection: (callback: (section: string) => void) => {
		ipcRenderer.on("jumpto-section", (_event: any, section: string) => callback(section));
	},
});
