const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
	sidebar: {
		toggle: () => ipcRenderer.send("toggle-sidebar"),
		getState: () => ipcRenderer.invoke("get-sidebar-state"),
		onState: (callback: (collapsed: boolean) => void) => {
			ipcRenderer.on("sidebar-state", (_event: any, collapsed: boolean) => callback(collapsed));
		},
	},
	onJumpToSection: (callback: (section: string) => void) => {
		ipcRenderer.on("jumpto-section", (_event: any, section: string) => callback(section));
	},
});
