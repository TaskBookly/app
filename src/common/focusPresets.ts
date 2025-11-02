export interface FocusPreset {
	id: string;
	name: string;
	workDurationMinutes: number;
	breakDurationMinutes: number;
	description?: string;
	builtIn: boolean;
}

export const DEFAULT_FOCUS_PRESET_ID = "classic";

export const BUILT_IN_FOCUS_PRESETS: FocusPreset[] = [
	{
		id: "classic",
		name: "Classic",
		workDurationMinutes: 25,
		breakDurationMinutes: 5,
		description: "General tasks (25/5)",
		builtIn: true,
	},
	{
		id: "deep",
		name: "Deep",
		workDurationMinutes: 90,
		breakDurationMinutes: 20,
		description: "Creative work, writing, problem solving (90/20)",
		builtIn: true,
	},
	{
		id: "quick",
		name: "Quick Batching",
		workDurationMinutes: 15,
		breakDurationMinutes: 3,
		description: "Minor tasks, emailing, scheduling (15/3)",
		builtIn: true,
	},
	{
		id: "am",
		name: "Morning Alignment",
		workDurationMinutes: 40,
		breakDurationMinutes: 10,
		description: "Stimulating brainstorming (40/10)",
		builtIn: true,
	},
	{
		id: "pm",
		name: "Afternoon Alignment",
		workDurationMinutes: 25,
		breakDurationMinutes: 5,
		description: "Combating afternoon slump (25/5)",
		builtIn: true,
	},
];

export const getBuiltInPresetById = (id: string): FocusPreset | undefined => {
	return BUILT_IN_FOCUS_PRESETS.find((preset) => preset.id === id);
};
