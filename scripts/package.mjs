#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const allowedChannels = new Set(["stable", "beta", "dev"]);
const channelShortcuts = new Map([
	["--stable", "stable"],
	["--beta", "beta"],
	["--dev", "dev"],
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function showUsage() {
	console.log(`Usage: npm run package -- [options] [electron-builder args]

Options:
  --channel, -c <name>     Set channel (stable, beta, dev)
  --stable|--beta|--dev    Shortcut for --channel
  --build, -b <number>     Provide build number (defaults to timestamp)
  --help, -h               Show this message

Examples:
  npm run package -- --beta --mac
  npm run publish -- --channel beta
`);
}

function parseArgs(argv) {
	let channel = process.env.TASKBOOKLY_BUILD_CHANNEL ?? "stable";
	let buildNumber = process.env.TASKBOOKLY_BUILD_NUMBER ?? "";
	const passThrough = [];

	const readNextValue = (flag, index) => {
		const next = argv[index + 1];
		if (!next || next.startsWith("-")) {
			console.error(`Missing value for ${flag}`);
			process.exit(1);
		}
		return next;
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		const lower = arg.toLowerCase();

		if (lower === "--help" || lower === "-h") {
			showUsage();
			process.exit(0);
		}

		if (channelShortcuts.has(lower)) {
			channel = channelShortcuts.get(lower);
			continue;
		}

		if (lower === "--channel" || lower === "-c") {
			channel = readNextValue(arg, index);
			index += 1;
			continue;
		}

		if (lower.startsWith("--channel=") || lower.startsWith("-c=")) {
			const [, value] = arg.split("=");
			if (value) {
				channel = value;
			}
			continue;
		}

		if (lower === "--build" || lower === "--build-number" || lower === "-b") {
			buildNumber = readNextValue(arg, index);
			index += 1;
			continue;
		}

		if (lower.startsWith("--build=") || lower.startsWith("--build-number=") || lower.startsWith("-b=")) {
			const [, value] = arg.split("=");
			if (value) {
				buildNumber = value;
			}
			continue;
		}

		passThrough.push(arg);
	}

	channel = channel.toLowerCase();

	if (!allowedChannels.has(channel)) {
		console.error(`Invalid channel "${channel}". Use one of: ${Array.from(allowedChannels).join(", ")}.`);
		process.exit(1);
	}

	if (!buildNumber) {
		buildNumber = new Date()
			.toISOString()
			.replace(/[-:TZ]/g, "")
			.slice(0, 12);
	}

	return { channel, buildNumber, builderArgs: passThrough };
}

function run(command, args, env) {
	const spawnOptions = {
		cwd: repoRoot,
		stdio: "inherit",
		env,
	};

	let result;

	if (process.platform === "win32") {
		const escape = (value) => {
			const escaped = value.replace(/(["^&|<>])/g, "^$1");
			if (/\s/.test(value)) {
				return `"${escaped}"`;
			}
			return escaped;
		};

		const commandLine = [command, ...args.map((arg) => String(arg))].map(escape).join(" ");
		result = spawnSync("cmd.exe", ["/d", "/s", "/c", commandLine], spawnOptions);
	} else {
		result = spawnSync(command, args, spawnOptions);
	}

	if (result.error) {
		console.error(`Failed to run ${command}:`, result.error.message);
		process.exit(result.status ?? 1);
	}

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function writeBuildMetadata(info) {
	const metadataDir = path.join(repoRoot, "dist-electron", "common");
	mkdirSync(metadataDir, { recursive: true });
	const metadataPath = path.join(metadataDir, "buildMeta.json");
	writeFileSync(metadataPath, JSON.stringify(info, null, 2));
}

const { channel, buildNumber, builderArgs: forwardArgs } = parseArgs(process.argv.slice(2));

const isPublishing = forwardArgs.some((arg) => {
	if (arg === "--publish") {
		return true;
	}
	if (arg.startsWith("--publish=")) {
		const [, value = ""] = arg.split("=");
		return value !== "never";
	}
	return false;
});

if (isPublishing && channel === "dev") {
	console.error("Publishing dev channel builds is not supported. Choose stable or beta.");
	process.exit(1);
}

const inferredReleaseType = isPublishing ? (channel === "beta" ? "prerelease" : "release") : null;

const packagePath = path.join(repoRoot, "package.json");
const pkg = JSON.parse(readFileSync(packagePath, "utf8"));

const generatedAt = new Date().toISOString();
const buildMetadata = {
	channel,
	buildNumber,
	version: pkg.version,
	generatedAt,
};

console.log("Packaging TaskBookly with:");
console.log(`  channel:     ${channel}`);
console.log(`  buildNumber: ${buildNumber}`);
console.log(`  version:     ${pkg.version}`);
console.log(`  generatedAt: ${generatedAt}`);
if (isPublishing) {
	console.log(`  publish:     yes (${inferredReleaseType ?? "auto"})`);
} else {
	console.log("  publish:     no");
}

const env = {
	...process.env,
	NODE_ENV: "production",
	TASKBOOKLY_BUILD_CHANNEL: channel,
	TASKBOOKLY_BUILD_NUMBER: buildNumber,
};

run("npm", ["run", "transpile:electron"], env);
run("npm", ["run", "build"], env);
writeBuildMetadata(buildMetadata);
const hasReleaseTypeOverride = forwardArgs.some((arg) => arg.startsWith("--config.publish.releaseType="));
const releaseArgs = [];

if (isPublishing && !hasReleaseTypeOverride) {
	releaseArgs.push(`--config.publish.releaseType=${inferredReleaseType}`);
}

const builderArgs = [...forwardArgs, ...releaseArgs, `--config.extraMetadata.taskbookly.channel=${channel}`, `--config.extraMetadata.taskbookly.buildNumber=${buildNumber}`, `--config.extraMetadata.taskbookly.generatedAt=${generatedAt}`];

run("npx", ["electron-builder", ...builderArgs], env);
