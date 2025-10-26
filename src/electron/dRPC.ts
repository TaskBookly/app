import { ActivityType } from "discord-api-types/v10";
import { Client } from "@xhayper/discord-rpc";
import { appVersion } from "./main.js";

const client = new Client({ clientId: "1431768816920035338" });

export interface focusActivity {
	periodType: "work" | "break" | "transition";
	periodStartUnix?: number;
	periodEndUnix?: number;
}

let isClientReady = false;
let loginPromise: Promise<void> | null = null;
let pendingActivity: focusActivity | null = null;

function ensureConnected(): void {
	if (client.isConnected || loginPromise) {
		return;
	}
	loginPromise = client
		.login()
		.catch((error) => {
			console.error("Failed to connect Discord RPC:", error);
		})
		.finally(() => {
			loginPromise = null;
		});
}

function applyActivity(activity: focusActivity | null): void {
	if (!client.isConnected || !isClientReady || !client.user) {
		return;
	}

	if (!activity) {
		const pid = typeof process !== "undefined" && typeof process.pid === "number" ? process.pid : 0;
		void client.request("SET_ACTIVITY", { pid, activity: null }).catch((error) => {
			console.error("Failed to clear Discord RPC activity:", error);
		});
		return;
	}

	const startTimestamp = typeof activity.periodStartUnix === "number" ? new Date(activity.periodStartUnix * 1000) : undefined;
	const endTimestamp = typeof activity.periodEndUnix === "number" ? new Date(activity.periodEndUnix * 1000) : undefined;

	client.user
		.setActivity({
			type: ActivityType.Watching,
			largeImageKey: "taskbookly",
			largeImageText: `v${appVersion}`,
			smallImageKey: `session_${activity.periodType}`,
			smallImageText: `${client.user.username} is currently ${activity.periodType === "work" ? "working" : activity.periodType === "break" ? "taking a break" : activity.periodType === "transition" ? "transitioning to their next session" : "N/A"}`,
			details: activity.periodType === "work" ? "Working" : activity.periodType === "break" ? "Taking a Break" : activity.periodType === "transition" ? "Transitioning" : "Idk what bro is doing",
			startTimestamp,
			endTimestamp,
		})
		.catch((error) => {
			console.error("Failed to set Discord RPC activity:", error);
		});
}

export function startupDisRPC() {
	ensureConnected();
}

client.on("ready", () => {
	isClientReady = true;
	applyActivity(pendingActivity);
});

client.on("disconnected", () => {
	isClientReady = false;
});

export function updateDisRPC(args: focusActivity) {
	pendingActivity = { ...args };
	ensureConnected();
	applyActivity(pendingActivity);
}

export function clearDisRPC() {
	pendingActivity = null;
	applyActivity(null);
}
