import { app } from "electron";
import path from "path";
import { isDev } from "./utils.js";

export function getPublicAssetPath(assetPath: string): string {
	if (isDev()) {
		// In development, assets are served from the public directory
		return path.join(process.cwd(), "public", "assets", assetPath);
	} else {
		// In production, public assets are copied to the root of dist-react (not in static/)
		return path.join(app.getAppPath(), "dist-react", "assets", assetPath);
	}
}
