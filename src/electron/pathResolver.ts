import { app } from "electron";
import { isDev } from "./utils.js";
import path from "path";

export function getPreloadPath(): string {
	return path.join(app.getAppPath(), isDev() ? "." : "..", "/dist-electron/preload.cjs");
}
