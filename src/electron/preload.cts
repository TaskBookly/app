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
	settings: {
		load: () => ipcRenderer.invoke("settings-load"),
		get: (key: string) => ipcRenderer.invoke("settings-get", key),
		set: (key: string, value: string) => ipcRenderer.invoke("settings-set", key, value),
	},
	onJumpToSection: (callback: (section: string) => void) => {
		ipcRenderer.on("jumpto-section", (_event: any, section: string) => callback(section));
	},
});
