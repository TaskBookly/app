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
		sendStatus: (status: "counting" | "paused" | "stopped", session: "work" | "break" | "transition", timeLeft: number) => {
			ipcRenderer.send("focus-status-update", status, session, timeLeft);
		},
		onAction: (callback: (action: string, data?: any) => void) => {
			ipcRenderer.on("focus-action", (_event: any, action: string, data?: any) => callback(action, data));
		},
		removeActionListener: (callback: (action: string, data?: any) => void) => {
			ipcRenderer.removeListener("focus-action", callback);
		},
	},
	onJumpToSection: (callback: (section: string) => void) => {
		ipcRenderer.on("jumpto-section", (_event: any, section: string) => callback(section));
	},
});
