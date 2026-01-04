import { app } from "electron";
import path from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import crypto from "crypto";
import { BUILT_IN_FOCUS_PRESETS, DEFAULT_FOCUS_PRESET_ID, type FocusPreset, getBuiltInPresetById } from "../common/focusPresets.js";

interface StoredPreset {
	id: string;
	name: string;
	workDurationMinutes: number;
	breakDurationMinutes: number;
	description?: string;
}

interface FocusPresetFile {
	selectedPresetId?: string;
	customPresets?: StoredPreset[];
}

const clampDuration = (value: number, min: number, max: number): number => {
	if (Number.isNaN(value)) return min;
	return Math.min(Math.max(Math.trunc(value), min), max);
};

const sanitizeName = (name: string): string => {
	const trimmed = name.trim();
	return trimmed.length === 0 ? "Custom Preset" : trimmed.slice(0, 80);
};

class FocusPresetStore {
	private readonly filePath: string;
	private customPresets: FocusPreset[] = [];
	private selectedPresetId: string = DEFAULT_FOCUS_PRESET_ID;

	constructor() {
		const userData = app.getPath("userData");
		if (!existsSync(userData)) {
			mkdirSync(userData, { recursive: true });
		}
		this.filePath = path.join(userData, "focusPresets.json");
		this.load();
	}

	public getPresets(): FocusPreset[] {
		const custom = this.customPresets.map((preset) => ({ ...preset, builtIn: false }));
		return [...BUILT_IN_FOCUS_PRESETS, ...custom];
	}

	public getSelectedPresetId(): string {
		return this.selectedPresetId;
	}

	public getSelectedPreset(): FocusPreset {
		return this.findPresetById(this.selectedPresetId) ?? BUILT_IN_FOCUS_PRESETS[0];
	}

	public setSelectedPreset(presetId: string): FocusPreset {
		const resolved = this.findPresetById(presetId) ?? BUILT_IN_FOCUS_PRESETS[0];
		this.selectedPresetId = resolved.id;
		this.save();
		return resolved;
	}

	public createPreset(payload: { name: string; workDurationMinutes: number; breakDurationMinutes: number; description?: string }): FocusPreset {
		const preset: FocusPreset = {
			id: this.generateId(),
			name: sanitizeName(payload.name),
			workDurationMinutes: clampDuration(payload.workDurationMinutes, 1, 180),
			breakDurationMinutes: clampDuration(payload.breakDurationMinutes, 1, 60),
			description: payload.description?.trim() || undefined,
			builtIn: false,
		};
		this.customPresets.push(preset);
		this.sortCustomPresets();
		this.save();
		return preset;
	}

	public updatePreset(presetId: string, payload: { name: string; workDurationMinutes: number; breakDurationMinutes: number; description?: string }): FocusPreset | null {
		const index = this.customPresets.findIndex((preset) => preset.id === presetId);
		if (index === -1) {
			return null;
		}
		const updated: FocusPreset = {
			...this.customPresets[index],
			name: sanitizeName(payload.name),
			workDurationMinutes: clampDuration(payload.workDurationMinutes, 1, 180),
			breakDurationMinutes: clampDuration(payload.breakDurationMinutes, 1, 60),
			description: payload.description?.trim() || undefined,
		};
		this.customPresets[index] = { ...updated };
		this.sortCustomPresets();
		this.save();
		return updated;
	}

	public deletePreset(presetId: string): boolean {
		const index = this.customPresets.findIndex((preset) => preset.id === presetId);
		if (index === -1) {
			return false;
		}
		this.customPresets.splice(index, 1);
		if (this.selectedPresetId === presetId) {
			this.selectedPresetId = DEFAULT_FOCUS_PRESET_ID;
		}
		this.save();
		return true;
	}

	private load(): void {
		if (!existsSync(this.filePath)) {
			this.customPresets = [];
			this.selectedPresetId = DEFAULT_FOCUS_PRESET_ID;
			this.save();
			return;
		}

		try {
			const raw = readFileSync(this.filePath, "utf8");
			const parsed = JSON.parse(raw) as FocusPresetFile;
			if (Array.isArray(parsed.customPresets)) {
				this.customPresets = parsed.customPresets.map((preset) => this.sanitizeStoredPreset(preset)).filter((preset): preset is FocusPreset => preset !== null);
			} else {
				this.customPresets = [];
			}
			if (typeof parsed.selectedPresetId === "string" && this.findPresetById(parsed.selectedPresetId)) {
				this.selectedPresetId = parsed.selectedPresetId;
			} else {
				this.selectedPresetId = DEFAULT_FOCUS_PRESET_ID;
			}
			this.sortCustomPresets();
			this.save();
		} catch (error) {
			console.error("Failed to load focus presets:", error);
			this.customPresets = [];
			this.selectedPresetId = DEFAULT_FOCUS_PRESET_ID;
			this.save();
		}
	}

	private save(): void {
		const payload: FocusPresetFile = {
			selectedPresetId: this.selectedPresetId,
			customPresets: this.customPresets.map((preset) => {
				const { builtIn, ...storedPreset } = preset;
				void builtIn;
				return storedPreset;
			}),
		};
		try {
			writeFileSync(this.filePath, JSON.stringify(payload, null, 2));
		} catch (error) {
			console.error("Failed to save focus presets:", error);
		}
	}

	private findPresetById(presetId: string): FocusPreset | undefined {
		return this.customPresets.find((preset) => preset.id === presetId) ?? getBuiltInPresetById(presetId);
	}

	private sanitizeStoredPreset(preset: StoredPreset): FocusPreset | null {
		if (!preset || typeof preset !== "object") {
			return null;
		}
		const name = typeof preset.name === "string" ? sanitizeName(preset.name) : "Custom Preset";
		const work = clampDuration(Number(preset.workDurationMinutes), 1, 180);
		const rest = clampDuration(Number(preset.breakDurationMinutes), 1, 60);
		const description = typeof preset.description === "string" && preset.description.trim().length > 0 ? preset.description.trim() : undefined;
		if (typeof preset.id !== "string" || preset.id.trim().length === 0) {
			return {
				id: this.generateId(),
				name,
				workDurationMinutes: work,
				breakDurationMinutes: rest,
				description,
				builtIn: false,
			};
		}
		return {
			id: preset.id,
			name,
			workDurationMinutes: work,
			breakDurationMinutes: rest,
			description,
			builtIn: false,
		};
	}

	private generateId(): string {
		if (typeof crypto.randomUUID === "function") {
			return crypto.randomUUID();
		}
		return crypto.randomBytes(8).toString("hex");
	}

	private sortCustomPresets(): void {
		this.customPresets.sort((a, b) => a.name.localeCompare(b.name));
	}
}

export default FocusPresetStore;
