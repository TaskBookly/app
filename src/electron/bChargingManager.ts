import { app } from "electron";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from "crypto";
import path from "path";
import { hostname, platform, arch } from "os";

interface SecretData {
	currentCharges: number;
	timeLeftTillNextCharge: number; // in seconds
	breakChargesSinceLastUse: number;
	lastWorkTimeTracked: number; // timestamp
	totalWorkTimeAccumulated: number; // in seconds
	version: number; // for future migrations
}

class SecretDataManager {
	private static instance: SecretDataManager;
	private readonly filePath: string;
	private readonly encryptionKey: Buffer;
	private data: SecretData;
	private saveTimeout: NodeJS.Timeout | null = null;

	private constructor() {
		const userDataPath = app.getPath("userData");
		if (!existsSync(userDataPath)) {
			mkdirSync(userDataPath, { recursive: true });
		}

		this.filePath = path.join(userDataPath, "bCharge.enc");

		// Generate persistent encryption key using stable identifiers
		// This ensures data survives app reinstallation and version updates
		// Remove app.getPath("exe") and app.getVersion() as they change during reinstallation
		const keyMaterial = [
			userDataPath, // Stable across reinstalls
			hostname(), // Computer hostname
			platform(), // OS platform
			arch(), // CPU architecture
			"taskbookly-stable-v1", // App identifier
		].join("|");

		this.encryptionKey = scryptSync(keyMaterial, "taskbookly-stable-salt", 32);

		this.data = this.loadData();
	}

	public static getInstance(): SecretDataManager {
		if (!SecretDataManager.instance) {
			SecretDataManager.instance = new SecretDataManager();
		}
		return SecretDataManager.instance;
	}

	private loadData(): SecretData {
		const defaultData: SecretData = {
			currentCharges: 0,
			timeLeftTillNextCharge: 60 * 60, // Default to 1 hour of work needed
			breakChargesSinceLastUse: 0,
			lastWorkTimeTracked: Date.now(),
			totalWorkTimeAccumulated: 0,
			version: 1,
		};

		if (!existsSync(this.filePath)) {
			return defaultData;
		}

		try {
			const encryptedData = readFileSync(this.filePath);
			const decryptedData = this.decrypt(encryptedData);
			const parsed = JSON.parse(decryptedData);

			// Validate and migrate data if needed
			if (this.isValidSecretData(parsed)) {
				return this.migrateDataIfNeeded(parsed);
			}
		} catch (error) {
			console.error("Failed to load secret data:", error);
		}

		return defaultData;
	}

	private isValidSecretData(data: unknown): data is SecretData {
		if (typeof data !== "object" || data === null) {
			return false;
		}
		const candidate = data as Partial<SecretData>;
		return (
			typeof candidate.currentCharges === "number" &&
			typeof candidate.timeLeftTillNextCharge === "number" &&
			typeof candidate.breakChargesSinceLastUse === "number" &&
			typeof candidate.lastWorkTimeTracked === "number" &&
			typeof candidate.totalWorkTimeAccumulated === "number" &&
			(candidate.version === undefined || typeof candidate.version === "number")
		);
	}

	private migrateDataIfNeeded(data: SecretData): SecretData {
		if (!data.version) {
			return { ...data, version: 1 };
		}
		return data;
	}

	private debouncedSave(): void {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}

		this.saveTimeout = setTimeout(() => {
			this.saveData();
			this.saveTimeout = null;
		}, 1000); // Save after 1 second of inactivity
	}

	private saveData(): void {
		try {
			const jsonData = JSON.stringify(this.data);
			const encryptedData = this.encrypt(jsonData);
			writeFileSync(this.filePath, encryptedData);
		} catch (error) {
			console.error("Failed to save secret data:", error);
		}
	}

	private encrypt(text: string): Buffer {
		const iv = randomBytes(16);
		const cipher = createCipheriv("aes-256-cbc", this.encryptionKey, iv);
		const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

		// Create integrity hash using HMAC for better security
		const hmac = createHash("sha256");
		hmac.update(this.encryptionKey);
		hmac.update(encrypted);
		const hash = hmac.digest();

		return Buffer.concat([iv, hash, encrypted]);
	}

	private decrypt(buffer: Buffer): string {
		if (buffer.length < 48) {
			// 16 (IV) + 32 (hash) minimum
			throw new Error("Invalid encrypted data format");
		}

		const iv = buffer.slice(0, 16);
		const hash = buffer.slice(16, 48);
		const encrypted = buffer.slice(48);

		// Try new stable key format first
		const hmacNew = createHash("sha256");
		hmacNew.update(this.encryptionKey);
		hmacNew.update(encrypted);
		const expectedHashNew = hmacNew.digest();

		const useNewFormat = hash.equals(expectedHashNew);

		// If new format fails, try old format for backward compatibility
		if (!useNewFormat) {
			const hmacOld = createHash("sha256");
			hmacOld.update(encrypted);
			const expectedHashOld = hmacOld.digest();

			if (!hash.equals(expectedHashOld)) {
				// Try legacy key format (with exe path and version)
				try {
					const legacyKeyMaterial = [app.getPath("exe"), app.getVersion(), hostname(), platform(), arch()].join("|");
					const legacyKey = scryptSync(legacyKeyMaterial, "taskbookly-v2-salt", 32);

					const hmacLegacy = createHash("sha256");
					hmacLegacy.update(legacyKey);
					hmacLegacy.update(encrypted);
					const expectedHashLegacy = hmacLegacy.digest();

					if (hash.equals(expectedHashLegacy)) {
						// Successfully validated with legacy key, decrypt and re-save with new key
						const decipher = createDecipheriv("aes-256-cbc", legacyKey, iv);
						const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");

						// Re-encrypt with new stable key for future use
						setTimeout(() => {
							this.saveData();
						}, 100);

						return decrypted;
					}
				} catch (legacyError) {
					if (process.env.NODE_ENV !== "production") {
						console.debug("Legacy key validation failed", legacyError);
					}
				}

				throw new Error("Data integrity check failed");
			}
		}

		const decipher = createDecipheriv("aes-256-cbc", this.encryptionKey, iv);
		return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
	}

	public getCurrentCharges(): number {
		return this.data.currentCharges;
	}

	public getTimeLeftTillNextCharge(): number {
		return this.data.timeLeftTillNextCharge;
	}

	public getBreakChargesSinceLastUse(): number {
		return this.data.breakChargesSinceLastUse;
	}

	public addWorkTime(seconds: number): void {
		if (seconds <= 0) return; // Don't add negative or zero time

		this.data.totalWorkTimeAccumulated += seconds;
		this.data.lastWorkTimeTracked = Date.now();

		// Ensure values stay within reasonable bounds
		if (this.data.totalWorkTimeAccumulated < 0) {
			this.data.totalWorkTimeAccumulated = 0;
		}

		this.debouncedSave();
	}

	public updateChargeProgress(workTimePerCharge: number): void {
		if (workTimePerCharge <= 0) return; // Invalid work time per charge

		const workTimePerChargeSeconds = workTimePerCharge * 60;

		while (this.data.totalWorkTimeAccumulated >= workTimePerChargeSeconds) {
			// Award a charge (handle multiple charges earned at once)
			this.data.currentCharges++;
			this.data.totalWorkTimeAccumulated -= workTimePerChargeSeconds;
		}

		// Update time left till next charge
		this.data.timeLeftTillNextCharge = Math.max(0, workTimePerChargeSeconds - this.data.totalWorkTimeAccumulated);

		// Ensure reasonable bounds
		if (this.data.currentCharges < 0) this.data.currentCharges = 0;
		if (this.data.currentCharges > 999) this.data.currentCharges = 999; // Reasonable upper limit

		this.debouncedSave();
	}

	public useCharge(cooldownPeriod: number): boolean {
		if (cooldownPeriod < 0) cooldownPeriod = 0; // Ensure non-negative cooldown

		if (this.data.currentCharges > 0 && this.data.breakChargesSinceLastUse >= cooldownPeriod) {
			this.data.currentCharges--;
			this.data.breakChargesSinceLastUse = 0;

			// Ensure values stay within bounds
			if (this.data.currentCharges < 0) this.data.currentCharges = 0;

			this.saveData(); // Immediate save for important actions
			return true;
		}
		return false;
	}

	public incrementBreakSessionsSinceLastUse(): void {
		this.data.breakChargesSinceLastUse++;

		// Ensure reasonable bounds
		if (this.data.breakChargesSinceLastUse < 0) this.data.breakChargesSinceLastUse = 0;
		if (this.data.breakChargesSinceLastUse > 999) this.data.breakChargesSinceLastUse = 999;

		this.saveData(); // Immediate save for important actions
	}

	public getChargeData(): SecretData {
		return { ...this.data };
	}

	public initializeChargeProgress(workTimePerCharge: number): void {
		// Initialize time left till next charge based on current settings
		if (workTimePerCharge > 0) {
			const workTimePerChargeSeconds = workTimePerCharge * 60;
			this.data.timeLeftTillNextCharge = Math.max(0, workTimePerChargeSeconds - this.data.totalWorkTimeAccumulated);
			this.saveData(); // Force immediate save to update data
		}
	}

	public forceUpdate(): void {
		// Force an immediate update to trigger data refresh
		this.saveData();
	}

	public resetData(): void {
		this.data = {
			currentCharges: 0,
			timeLeftTillNextCharge: 60 * 60, // Default to 1 hour of work needed
			breakChargesSinceLastUse: 0,
			lastWorkTimeTracked: Date.now(),
			totalWorkTimeAccumulated: 0,
			version: 1,
		};
		this.saveData();
	}

	public cleanup(): void {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
			this.saveData(); // Final save
		}
	}
}

export default SecretDataManager;
export type { SecretData };
