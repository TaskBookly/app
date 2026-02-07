export const FOCUS_PRESET_SECTION_LABELS = ["Everyday Productivity", "Study & Learning", "Deep Focus & Creativity", "Quick Wins"] as const;

export type FocusPresetSection = (typeof FOCUS_PRESET_SECTION_LABELS)[number];

export interface FocusPreset {
	id: string;
	name: string;
	workDurationMinutes: number;
	breakDurationMinutes: number;
	description?: string;
	section?: FocusPresetSection;
	builtIn: boolean;
}

export const DEFAULT_FOCUS_PRESET_ID = "classic";

export const BUILT_IN_FOCUS_PRESETS: FocusPreset[] = [
	{
		id: "classic",
		name: "Classic Pomodoro",
		workDurationMinutes: 25,
		breakDurationMinutes: 5,
		description: "Classic rhythm to overcome procrastination",
		section: "Everyday Productivity",
		builtIn: true,
	},
	{
		id: "balanced-flow",
		name: "Balanced Flow",
		workDurationMinutes: 52,
		breakDurationMinutes: 17,
		description: "Optimizes energy to prevent burn out",
		section: "Everyday Productivity",
		builtIn: true,
	},
	{
		id: "hourly-block",
		name: "Hourly Block",
		workDurationMinutes: 50,
		breakDurationMinutes: 10,
		description: "Aligns perfectly with standard calendar hours",
		section: "Everyday Productivity",
		builtIn: true,
	},
	{
		id: "momentum",
		name: "Momentum Builder",
		workDurationMinutes: 40,
		breakDurationMinutes: 10,
		description: "A steady pace for standard workloads",
		section: "Everyday Productivity",
		builtIn: true,
	},
	{
		id: "deep-dive",
		name: "Deep Dive",
		workDurationMinutes: 90,
		breakDurationMinutes: 20,
		description: "Long session for getting in the zone",
		section: "Deep Focus & Creativity",
		builtIn: true,
	},
	{
		id: "immersive",
		name: "Immersive",
		workDurationMinutes: 75,
		breakDurationMinutes: 15,
		description: "Extended focus for complex projects",
		section: "Deep Focus & Creativity",
		builtIn: true,
	},
	{
		id: "long-haul",
		name: "Long Haul",
		workDurationMinutes: 60,
		breakDurationMinutes: 10,
		description: "Solid focus time with a quick reset",
		section: "Deep Focus & Creativity",
		builtIn: true,
	},
	{
		id: "quick-start",
		name: "Quick Start",
		workDurationMinutes: 15,
		breakDurationMinutes: 3,
		description: "The easiest way to just get started",
		section: "Quick Wins",
		builtIn: true,
	},
	{
		id: "screen-break",
		name: "Screen Break",
		workDurationMinutes: 20,
		breakDurationMinutes: 2,
		description: "Keeps your eyes fresh during intense screen time",
		section: "Quick Wins",
		builtIn: true,
	},
	{
		id: "rapid-batching",
		name: "Rapid Batching",
		workDurationMinutes: 30,
		breakDurationMinutes: 5,
		description: "Great for clearing out your inbox quickly",
		section: "Quick Wins",
		builtIn: true,
	},
	{
		id: "study-session",
		name: "Study Session",
		workDurationMinutes: 45,
		breakDurationMinutes: 15,
		description: "Gives your brain time to absorb what you read",
		section: "Study & Learning",
		builtIn: true,
	},
	{
		id: "retention-mode",
		name: "Retention Mode",
		workDurationMinutes: 35,
		breakDurationMinutes: 7,
		description: "Shorter chunks to help you remember more",
		section: "Study & Learning",
		builtIn: true,
	},
	{
		id: "intense-review",
		name: "Intense Review",
		workDurationMinutes: 25,
		breakDurationMinutes: 10,
		description: "Intense focus with ample recovery time",
		section: "Study & Learning",
		builtIn: true,
	},
];

export const getBuiltInPresetById = (id: string): FocusPreset | undefined => {
	return BUILT_IN_FOCUS_PRESETS.find((preset) => preset.id === id);
};
