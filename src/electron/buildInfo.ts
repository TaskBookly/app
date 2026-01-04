import { app } from "electron";
import { existsSync, readFileSync } from "fs";
import path from "path";

export type BuildChannel = "stable" | "beta" | "dev";

export interface BuildInfo {
	channel: BuildChannel;
	buildNumber: string;
	version: string;
	generatedAt?: string;
}

let cachedInfo: BuildInfo | undefined;

function normalizeChannel(candidate: string | undefined): BuildChannel {
	const value = candidate?.toLowerCase();
	if (value === "stable" || value === "beta" || value === "dev") {
		return value;
	}
	return app.isPackaged ? "stable" : "dev";
}

function resolveMetadataPath(): string | null {
	const appPath = app.getAppPath();
	const candidates = [path.join(appPath, "dist-electron", "common", "buildMeta.json"), path.join(process.cwd(), "dist-electron", "common", "buildMeta.json")];

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	return null;
}

function readPackageMetadata(): (Partial<BuildInfo> & { channel?: string }) | null {
	try {
		const pkgPath = path.join(app.getAppPath(), "package.json");
		if (!existsSync(pkgPath)) {
			return null;
		}
		const raw = readFileSync(pkgPath, "utf8");
		const parsed = JSON.parse(raw) as { taskbookly?: Partial<BuildInfo> & { channel?: string } };
		return parsed.taskbookly ?? null;
	} catch (error) {
		console.warn("Failed to load package metadata", error);
		return null;
	}
}

export function getBuildInfo(): BuildInfo {
	if (cachedInfo) {
		return cachedInfo;
	}

	const defaults: BuildInfo = {
		channel: normalizeChannel(process.env.TASKBOOKLY_BUILD_CHANNEL),
		buildNumber: process.env.TASKBOOKLY_BUILD_NUMBER || (app.isPackaged ? "0" : "dev-local"),
		version: app.getVersion(),
	};

	const isDevRuntime = !app.isPackaged && process.env.NODE_ENV !== "production";
	if (isDevRuntime) {
		cachedInfo = defaults;
		return cachedInfo;
	}

	try {
		const metadataPath = resolveMetadataPath();
		if (metadataPath) {
			const raw = readFileSync(metadataPath, "utf8");
			const parsed = JSON.parse(raw) as Partial<BuildInfo> & { channel?: string };

			cachedInfo = {
				...defaults,
				...parsed,
				channel: normalizeChannel(parsed.channel),
				buildNumber: parsed.buildNumber ?? defaults.buildNumber,
				version: parsed.version ?? defaults.version,
			};
			return cachedInfo;
		}
	} catch (error) {
		console.warn("Failed to load build metadata file", error);
	}

	const pkgMeta = readPackageMetadata();
	if (pkgMeta) {
		cachedInfo = {
			...defaults,
			...pkgMeta,
			channel: normalizeChannel(pkgMeta.channel),
			buildNumber: pkgMeta.buildNumber ?? defaults.buildNumber,
			version: pkgMeta.version ?? defaults.version,
		};
		return cachedInfo;
	}

	cachedInfo = defaults;
	return cachedInfo;
}
