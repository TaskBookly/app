import { app } from "electron";
import { isDev } from "./utils.js";
import path from "path";

export function getPreloadPath(): string {
	const segments: string[] = [app.getAppPath()];
	if (!isDev()) {
		segments.push("..");
	}
	segments.push("dist-electron", "electron", "preload.cjs");
	return path.join(...segments);
}
