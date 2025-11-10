export const FOCUS_PRESET_SECTION_LABELS = ["Productivity Staples", "Study & Learning", "Work & Creative", "Science-Based"] as const;

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
		description: "Everyday tasks, studying, & light work",
		section: "Productivity Staples",
		builtIn: true,
	},
	{
		id: "deep",
		name: "Deep Work",
		workDurationMinutes: 90,
		breakDurationMinutes: 20,
		description: "General creative or analytical work",
		section: "Productivity Staples",
		builtIn: true,
	},
	{
		id: "gentle",
		name: "Gentle Start",
		workDurationMinutes: 15,
		breakDurationMinutes: 5,
		description: "Easing into tasks",
		section: "Productivity Staples",
		builtIn: true,
	},
	{
		id: "studyBurst",
		name: "Study Burst",
		workDurationMinutes: 40,
		breakDurationMinutes: 10,
		description: "Reading comprehension or memorization",
		section: "Study & Learning",
		builtIn: true,
	},
	{
		id: "examCram",
		name: "Exam Cram",
		workDurationMinutes: 60,
		breakDurationMinutes: 10,
		description: "Studying large volumes quickly",
		section: "Study & Learning",
		builtIn: true,
	},
	{
		id: "reviewCycle",
		name: "Review Cycle",
		workDurationMinutes: 30,
		breakDurationMinutes: 5,
		description: "Reviewing notes or flashcards",
		section: "Study & Learning",
		builtIn: true,
	},
	{
		id: "readingFocus",
		name: "Reading Focus",
		workDurationMinutes: 45,
		breakDurationMinutes: 15,
		description: "Deep reading or research",
		section: "Study & Learning",
		builtIn: true,
	},
	{
		id: "codingSprint",
		name: "Coding Sprint",
		workDurationMinutes: 52,
		breakDurationMinutes: 17,
		description: "Programming or debugging",
		section: "Work & Creative",
		builtIn: true,
	},
	{
		id: "designFlow",
		name: "Design Flow",
		workDurationMinutes: 70,
		breakDurationMinutes: 10,
		description: "Creative design sessions",
		section: "Work & Creative",
		builtIn: true,
	},
	{
		id: "writerBlockBuster",
		name: "Writer Block Buster",
		workDurationMinutes: 45,
		breakDurationMinutes: 15,
		description: "Writing, journaling, or brainstorming",
		section: "Work & Creative",
		builtIn: true,
	},
	{
		id: "adminCycle",
		name: "Admin Cycle",
		workDurationMinutes: 30,
		breakDurationMinutes: 5,
		description: "Emails, scheduling, or smaller administrative tasks",
		section: "Work & Creative",
		builtIn: true,
	},
	{
		id: "ultradian",
		name: "Ultradian Rhythm Cycle",
		workDurationMinutes: 90,
		breakDurationMinutes: 30,
		description: "Long projects — aligns with natural brain energy cycles",
		section: "Science-Based",
		builtIn: true,
	},
	{
		id: "twoHour",
		name: "Two-Hour Macro Block",
		workDurationMinutes: 100,
		breakDurationMinutes: 20,
		description: "Multi-step creative or technical tasks",
		section: "Science-Based",
		builtIn: true,
	},
	{
		id: "cognitiveFlex",
		name: "Cognitive Flex Cycle",
		workDurationMinutes: 35,
		breakDurationMinutes: 7,
		description: "High cognitive-load tasks",
		section: "Science-Based",
		builtIn: true,
	},
];

export const getBuiltInPresetById = (id: string): FocusPreset | undefined => {
	return BUILT_IN_FOCUS_PRESETS.find((preset) => preset.id === id);
};
