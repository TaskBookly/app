import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import IcoButton, { Container, ActionMenu, type ActionMenuOption, SelectionMenu, type SelectionMenuOption } from "../core";
import { ButtonActionConfig } from "../config";
import { formatAsTime, formatAsClockTime } from "../../utils/format";
import { useSettings } from "../SettingsContext";
import { faAnglesRight, faBolt, faBriefcase, faCloudBolt, faCloudShowersHeavy, faCloudShowersWater, faFire, faHourglassHalf, faInfoCircle, faLeaf, faMugSaucer, faPause, faPencil, faPlay, faPlus, faRotate, faStop, faStopwatch, faVolumeLow, faWater, faWind } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { usePopup } from "../PopupProvider";
import type { FocusPreset } from "../../../common/focusPresets";

const Focus = () => {
	const { setSetting, getSetting } = useSettings();
	const [currentSession, setCurrentSession] = useState<"work" | "break" | "transition">("work");
	const [timerStatus, setTimerStatus] = useState<"counting" | "paused" | "stopped">("stopped");
	const [breakChargesLeft, setBreakChargesLeft] = useState<number>(0);
	const [timeLeftInSession, setTimeLeftInSession] = useState<number>(20 * 60);
	const [sessionExpectedFinishDate, setSessionExpectedFinishDate] = useState<Date>(new Date());
	const [timeLeftTillNextCharge, setTimeLeftTillNextCharge] = useState<number>(0);
	const [chargeProgressPercentage, setChargeProgressPercentage] = useState<number>(0);
	const [isOnCooldown, setIsOnCooldown] = useState<boolean>(false);
	const [cooldownBreaksLeft, setCooldownBreaksLeft] = useState<number>(0);
	const [isCharging, setIsCharging] = useState<boolean>(false);
	const [chargeUsedThisSession, setChargeUsedThisSession] = useState<boolean>(false);

	const [selectedSound, setSelectedSound] = useState("rain");
	const [soundStatus, setSoundStatus] = useState<"playing" | "stopped">("stopped");
	const audioContextRef = useRef<AudioContext | null>(null);
	const gainNodeRef = useRef<GainNode | null>(null);
	const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
	const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
	const currentSoundNameRef = useRef<string | null>(null);
	const actionIdRef = useRef(0);

	const { open, confirm } = usePopup();

	const [presets, setPresets] = useState<FocusPreset[]>([]);
	const [selectedPresetId, setSelectedPresetId] = useState<string>("");

	const refreshPresets = useCallback(async () => {
		try {
			const payload = await window.electron.focusPresets.list();
			if (!payload) return;
			setPresets(payload.presets);
			const fallbackId = payload.selectedPresetId || payload.presets[0]?.id || "";
			setSelectedPresetId(fallbackId);
		} catch (error) {
			console.error("Failed to load focus presets:", error);
		}
	}, []);

	useEffect(() => {
		refreshPresets();
	}, [refreshPresets]);

	const presetOptions = useMemo<SelectionMenuOption[]>(() => {
		if (!presets.length) {
			return [];
		}

		const options: SelectionMenuOption[] = [];
		const builtInSections = new Map<string, FocusPreset[]>();
		const sectionOrder: string[] = [];
		const fallbackSectionLabel = "Built-in Presets";

		const customPresets = presets.filter((preset) => !preset.builtIn);
		if (customPresets.length > 0) {
			options.push({ type: "separator", label: "Custom Presets" });
			for (const preset of customPresets) {
				options.push({
					label: preset.name,
					value: preset.id,
					data: [
						{
							icon: faBriefcase,
							data: `${preset.workDurationMinutes}m`,
						},
						{
							icon: faMugSaucer,
							data: `${preset.breakDurationMinutes}m`,
						},
					],
				});
			}
		}

		for (const preset of presets) {
			if (!preset.builtIn) continue;
			const sectionLabel = preset.section ?? fallbackSectionLabel;
			if (!builtInSections.has(sectionLabel)) {
				builtInSections.set(sectionLabel, []);
				sectionOrder.push(sectionLabel);
			}
			builtInSections.get(sectionLabel)!.push(preset);
		}

		for (const sectionLabel of sectionOrder) {
			const sectionPresets = builtInSections.get(sectionLabel);
			if (!sectionPresets || sectionPresets.length === 0) {
				continue;
			}
			options.push({ type: "separator", label: sectionLabel });
			for (const preset of sectionPresets) {
				options.push({
					label: preset.name,
					subLabel: preset.description ?? `Work ${preset.workDurationMinutes} min • Break ${preset.breakDurationMinutes} min`,
					value: preset.id,
					data: [
						{
							icon: faBriefcase,
							data: `${preset.workDurationMinutes}m`,
						},
						{
							icon: faMugSaucer,
							data: `${preset.breakDurationMinutes}m`,
						},
					],
				});
			}
		}

		return options;
	}, [presets]);

	const selectedPreset = useMemo(() => presets.find((preset) => preset.id === selectedPresetId), [presets, selectedPresetId]);

	const handlePresetChange = useCallback(
		(presetId: string) => {
			if (timerStatus !== "stopped") {
				return;
			}
			setSelectedPresetId(presetId);
			(async () => {
				try {
					await window.electron.focusPresets.setActive(presetId);
				} catch (error) {
					console.error("Failed to set active focus preset:", error);
				} finally {
					await refreshPresets();
				}
			})();
		},
		[timerStatus, refreshPresets]
	);

	const handleNewPreset = useCallback(async () => {
		if (timerStatus !== "stopped") {
			return;
		}

		const result = await open({
			title: "New Focus Preset",
			message: <p>Focus presets let you quickly swap between different work and break durations to suit what you are working on.</p>,
			inputs: [
				{ id: "name", label: "Preset name", type: "text", required: true, placeholder: "My preset" },
				{ id: "workDuration", label: "Work duration (minutes)", description: "How long work sessions will last.", type: "number", min: 1, max: 180, step: 1, required: true, defaultValue: 25 },
				{ id: "breakDuration", label: "Break duration (minutes)", description: "How long break sessions will last.", type: "number", min: 1, max: 60, step: 1, required: true, defaultValue: 5 },
			],
			actions: [
				{ label: "Cancel", id: "cancel" },
				{ label: "Create", id: "create", intent: "primary" },
			],
		});

		if (result.actionId !== "create") {
			return;
		}

		const name = typeof result.values.name === "string" ? result.values.name.trim() : "";
		const workDuration = typeof result.values.workDuration === "number" ? result.values.workDuration : NaN;
		const breakDuration = typeof result.values.breakDuration === "number" ? result.values.breakDuration : NaN;
		const workValid = Number.isFinite(workDuration) && workDuration >= 1 && workDuration <= 180;
		const breakValid = Number.isFinite(breakDuration) && breakDuration >= 1 && breakDuration <= 60;

		if (!name || !workValid || !breakValid) {
			return;
		}

		try {
			const created = await window.electron.focusPresets.create({
				name,
				workDurationMinutes: workDuration,
				breakDurationMinutes: breakDuration,
			});
			await window.electron.focusPresets.setActive(created.id);
			await refreshPresets();
		} catch (error) {
			console.error("Failed to create focus preset:", error);
		}
	}, [open, refreshPresets, timerStatus]);

	const handleEditPreset = useCallback(async () => {
		if (timerStatus !== "stopped") {
			return;
		}

		const preset = selectedPreset;
		if (!preset || preset.builtIn) {
			return;
		}

		const result = await open({
			title: `Edit ${preset.name}`,
			inputs: [
				{ id: "name", label: "Preset name", type: "text", required: true, defaultValue: preset.name },
				{ id: "workDuration", label: "Work duration (minutes)", type: "number", min: 1, max: 180, step: 1, required: true, defaultValue: preset.workDurationMinutes },
				{ id: "breakDuration", label: "Break duration (minutes)", type: "number", min: 1, max: 60, step: 1, required: true, defaultValue: preset.breakDurationMinutes },
			],
			actions: [
				{ label: "Delete", id: "delete", intent: "danger" },
				{ label: "Cancel", id: "cancel" },
				{ label: "Save", id: "save", intent: "primary" },
			],
		});

		if (result.actionId === "delete") {
			const result = await confirm({ title: `Delete ${preset.name}?`, message: "This cannot be undone!", confirmLabel: "Delete it!" });
			if (result) {
				try {
					const success = await window.electron.focusPresets.delete(preset.id);
					if (success) {
						await refreshPresets();
					}
				} catch (error) {
					console.error("Failed to delete focus preset:", error);
				}
			}
			return;
		}

		if (result.actionId !== "save") {
			return;
		}

		const name = typeof result.values.name === "string" ? result.values.name.trim() : "";
		const workDuration = typeof result.values.workDuration === "number" ? result.values.workDuration : NaN;
		const breakDuration = typeof result.values.breakDuration === "number" ? result.values.breakDuration : NaN;
		const workValid = Number.isFinite(workDuration) && workDuration >= 1 && workDuration <= 180;
		const breakValid = Number.isFinite(breakDuration) && breakDuration >= 1 && breakDuration <= 60;

		if (!name || !workValid || !breakValid) {
			return;
		}

		try {
			const updated = await window.electron.focusPresets.update(preset.id, {
				name,
				workDurationMinutes: workDuration,
				breakDurationMinutes: breakDuration,
			});
			if (updated) {
				await refreshPresets();
			}
		} catch (error) {
			console.error("Failed to update focus preset:", error);
		}
	}, [open, refreshPresets, selectedPreset, timerStatus, confirm]);

	// Listen for timer updates from backend
	useEffect(() => {
		const cleanup = window.electron.focus.onTimerUpdate((data) => {
			setCurrentSession((data.session as "work" | "break" | "transition") || "work");
			setTimerStatus((data.status as "counting" | "paused" | "stopped") || "stopped");
			setTimeLeftInSession(data.timeLeft || 0);
			setBreakChargesLeft(data.chargesLeft || 0);
			setTimeLeftTillNextCharge(data.timeLeftTillNextCharge || 0);

			// Check if we're gaining charge progress (charging effect)
			const newProgress = data.chargeProgressPercentage || 0;
			// Show charging effect when actively working (work session + counting) and break charging is enabled
			setIsCharging(data.session === "work" && data.status === "counting" && getSetting("breakChargingEnabled") === "true");
			setChargeProgressPercentage(newProgress);

			setIsOnCooldown(data.isOnCooldown || false);
			setCooldownBreaksLeft(data.cooldownBreaksLeft || 0);
			setChargeUsedThisSession(data.chargeUsedThisSession || false);

			if (typeof data.expectedFinish === "number" && data.status !== "stopped") {
				setSessionExpectedFinishDate(new Date(data.expectedFinish));
			} else if (data.timeLeft && data.status !== "stopped") {
				setSessionExpectedFinishDate(new Date(Date.now() + data.timeLeft * 1000));
			}
		});

		// Request initial data update on component mount
		window.electron.focus.requestDataUpdate();

		return cleanup;
	}, []);

	// Cleanup audio on unmount
	useEffect(() => {
		return () => {
			if (activeSourceNodeRef.current) {
				try {
					activeSourceNodeRef.current.stop();
				} catch (e) {
					// Ignore
				}
				activeSourceNodeRef.current = null;
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
				audioContextRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		let id: number | undefined;
		if (timerStatus === "paused") {
			id = window.setInterval(() => {
				setSessionExpectedFinishDate(new Date(Date.now() + timeLeftInSession * 1000));
			}, 1000);
		}

		return () => {
			if (id !== undefined) clearInterval(id);
		};
	}, [timerStatus, timeLeftInSession]);

	const workSessionAddTimeOptions: ActionMenuOption[] = [
		{ label: "1 minute", value: "60" },
		{ label: "2 minutes", value: "120" },
		{ label: "3 minutes", value: "180" },
		{ label: "4 minutes", value: "240" },
		{ label: "5 minutes", value: "300" },
		{ label: "10 minutes", value: "600" },
		{ label: "15 minutes", value: "900" },
		{ label: "20 minutes", value: "1200" },
	];

	// Simplified action handlers - backend will automatically send updates
	const handleStart = () => {
		window.electron.focus.start();
	};
	const handlePause = () => {
		window.electron.focus.pause();
	};
	const handleResume = () => {
		window.electron.focus.resume();
	};
	const handleStop = () => {
		window.electron.focus.stop();
	};
	const handleAddTime = (seconds: number) => {
		window.electron.focus.addTime(seconds);
	};

	const handleUseBreakCharge = async () => {
		await window.electron.focus.useBreakCharge();
	};

	const initAudioContext = () => {
		if (!audioContextRef.current) {
			const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
			audioContextRef.current = new AudioContextClass();
			gainNodeRef.current = audioContextRef.current.createGain();
			gainNodeRef.current.connect(audioContextRef.current.destination);
		}
		return audioContextRef.current;
	};

	const fadeAudio = (targetVolume: number, duration: number = 2000): Promise<void> => {
		const ctx = initAudioContext();
		const gainNode = gainNodeRef.current!;

		if (ctx.state === "suspended") {
			ctx.resume();
		}

		const currentTime = ctx.currentTime;
		// Cancel any ongoing ramps
		gainNode.gain.cancelScheduledValues(currentTime);

		// Anchor the current value to prevent jumping
		gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);

		// Use linear ramp for reliable fading
		gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + duration / 1000);

		return new Promise((resolve) => setTimeout(resolve, duration));
	};

	const playSound = useCallback(async (shouldPlay: boolean, soundName: string) => {
		const myId = ++actionIdRef.current;
		const targetStatus = shouldPlay ? "playing" : "stopped";

		// Update UI immediately
		setSoundStatus(targetStatus);

		const ctx = initAudioContext();
		const mainGain = gainNodeRef.current!;

		if (!shouldPlay) {
			// STOP
			if (activeSourceNodeRef.current) {
				await fadeAudio(0, 2000);
				// Only stop if no new action has started
				if (actionIdRef.current === myId) {
					try {
						activeSourceNodeRef.current.stop();
					} catch (e) {
						// Ignore
					}
					activeSourceNodeRef.current = null;
					currentSoundNameRef.current = null;
				}
			}
		} else {
			// PLAY
			// If already playing the same sound, just ensure volume is up
			if (activeSourceNodeRef.current && currentSoundNameRef.current === soundName) {
				await fadeAudio(0.5, 2000);
				return;
			}

			// If playing a different sound, fade out and stop first
			if (activeSourceNodeRef.current) {
				await fadeAudio(0, 2000);
				if (actionIdRef.current !== myId) return;
				try {
					activeSourceNodeRef.current.stop();
				} catch (e) {
					// Ignore
				}
				activeSourceNodeRef.current = null;
			}

			// Load buffer
			let buffer = bufferCacheRef.current.get(soundName);
			if (!buffer) {
				try {
					const response = await fetch(`/src/ui/assets/audio/focusSounds/${soundName}.mp3`);
					const arrayBuffer = await response.arrayBuffer();
					buffer = await ctx.decodeAudioData(arrayBuffer);
					bufferCacheRef.current.set(soundName, buffer);
				} catch (error) {
					console.error("Failed to load sound:", error);
					if (actionIdRef.current === myId) {
						setSoundStatus("stopped");
					}
					return;
				}
			}

			if (actionIdRef.current !== myId) return;

			// Create source and play
			const source = ctx.createBufferSource();
			source.buffer = buffer;
			source.loop = true;
			source.connect(mainGain);

			// Reset gain to 0 for fade in
			mainGain.gain.cancelScheduledValues(ctx.currentTime);
			mainGain.gain.setValueAtTime(0, ctx.currentTime);

			source.start(0);
			activeSourceNodeRef.current = source;
			currentSoundNameRef.current = soundName;

			await fadeAudio(0.5, 2000);
		}
	}, []);

	const handlePlaySound = useCallback(() => {
		playSound(soundStatus !== "playing", selectedSound);
	}, [soundStatus, playSound, selectedSound]);

	// Handle sound changes while playing (Manual Mode)
	useEffect(() => {
		const isAuto = getSetting("autoSoundMode") === "true";
		if (!isAuto && soundStatus === "playing") {
			playSound(true, selectedSound);
		}
	}, [selectedSound, getSetting, soundStatus, playSound]);

	// Handle auto-sound mode
	useEffect(() => {
		const isAutoSoundEnabled = getSetting("autoSoundMode") === "true";
		if (isAutoSoundEnabled) {
			// Auto-sound mode: play during work, stop during break/transition
			const shouldPlay = currentSession === "work" && timerStatus === "counting";
			playSound(shouldPlay, selectedSound);
		}
	}, [getSetting, currentSession, timerStatus, playSound, selectedSound]);

	const getCooldownMessage = () => {
		if (chargeUsedThisSession) {
			return "You've already used a charge this break session.";
		}
		if (cooldownBreaksLeft > 0) {
			return `You need to take ${cooldownBreaksLeft} more ${cooldownBreaksLeft === 1 ? "break" : "breaks"} before you can charge another break.`;
		}
		return null;
	};

	const soundOptions: ActionMenuOption[] = [
		{
			type: "toggle",
			label: "Auto-Sound Mode",
			subLabel: "Start/Stop sounds based on the current period",
			icon: faRotate,
			value: getSetting("autoSoundMode") === "true",
			onChange: () => setSetting("autoSoundMode", getSetting("autoSoundMode") === "true" ? "false" : "true"),
		},
		...(getSetting("autoSoundMode") !== "true"
			? [
					{
						type: "option",
						label: soundStatus === "playing" ? "Stop" : "Play",
						icon: soundStatus === "playing" ? faStop : faPlay,
						value: "play",
						onClick: handlePlaySound,
					} as ActionMenuOption,
			  ]
			: []),
		{ type: "separator", label: "Sounds" },
		{
			type: "selectionGroup",
			value: selectedSound,
			onChange: setSelectedSound,
			options: [
				{ label: "Rain", value: "rain", icon: faCloudShowersHeavy },
				{ label: "Indoor Rain", value: "indoorRain", icon: faCloudShowersWater },
				{ label: "Thunderstorm", value: "thunderstorm", icon: faCloudBolt },
				{ label: "Ocean Waves", value: "oceanWaves", icon: faWater },
				{ label: "Forest Ambience", value: "forest", icon: faLeaf },
				{ label: "Campfire", value: "campfire", icon: faFire },
				{ label: "Wind", value: "wind", icon: faWind },

				{ label: "White Noise", value: "whiteNoise", icon: faVolumeLow },
				{ label: "Pink Noise", value: "pinkNoise", icon: faVolumeLow },
				{ label: "Brown Noise", value: "brownNoise", icon: faVolumeLow },
			],
		},
	];

	return (
		<>
			{timerStatus !== "stopped" ? (
				<Container name="focus_time">
					<div id="timerCont">
						<div id="sessionType">
							<FontAwesomeIcon icon={currentSession === "work" ? faBriefcase : currentSession === "break" ? faMugSaucer : faAnglesRight} widthAuto />
							{currentSession === "work" ? "WORKING" : currentSession === "break" ? "TAKING A BREAK" : "TRANSITIONING"}
						</div>

						<label className={timerStatus === "paused" ? "paused" : undefined} id="sessionTimer">
							{formatAsTime(timeLeftInSession)}
						</label>
						<label id="sessionEndTime">{`Ending at ${formatAsClockTime(sessionExpectedFinishDate)}`}</label>
					</div>
				</Container>
			) : null}

			<Container name="focus_controls">
				<div className="groupList">
					<div id="focusPresets" className="buttonGroup">
						<SelectionMenu options={presetOptions} value={selectedPresetId} onChange={handlePresetChange} searchable placeholder="Choose Preset" disabled={timerStatus !== "stopped"} tooltip={timerStatus === "stopped" ? "Change Preset" : "Stop this session to change presets"} />
						{timerStatus === "stopped" ? (
							<>
								<IcoButton icon={faPlus} tooltip="Create Preset" onClick={{ action: handleNewPreset }} />
								<IcoButton icon={faPencil} tooltip={selectedPreset && selectedPreset.builtIn ? "Built-in presets cannot be edited" : "Edit Preset"} disabled={!selectedPreset || selectedPreset.builtIn} onClick={{ action: handleEditPreset }} />
							</>
						) : null}
					</div>
					<div className="buttonGroup">
						{timerStatus === "counting" ? (
							<>
								<IcoButton text="Pause" icon={faPause} disabled={currentSession === "break" || currentSession === "transition"} tooltip={currentSession === "break" || currentSession === "transition" ? "You cannot pause during this period" : undefined} onClick={{ action: handlePause }} />
								<IcoButton text="Stop" icon={faStop} onClick={{ action: handleStop }} />
							</>
						) : timerStatus === "paused" ? (
							<>
								<IcoButton text="Resume" icon={faPlay} onClick={{ action: handleResume }} />
								<IcoButton text="Stop" icon={faStop} onClick={{ action: handleStop }} />
							</>
						) : (
							<IcoButton text="Start" icon={faPlay} onClick={{ action: handleStart }} />
						)}
						{currentSession === "work" && timerStatus !== "stopped" ? <ActionMenu options={workSessionAddTimeOptions} onOptionSelect={(value: string) => handleAddTime(parseInt(value, 10))} button={<IcoButton icon={faStopwatch} text="Add Time" />} /> : null}
						<ActionMenu options={soundOptions} button={<IcoButton icon={faVolumeLow} text="Sound" />} />
					</div>
				</div>
			</Container>
			{getSetting("breakChargingEnabled") === "true" ? (
				<Container name="focus_breakCharging" header={{ title: "Break Charging", icon: faBolt, buttons: [{ icon: faInfoCircle, onClick: { action: () => open({ title: "Break Charging", message: "As you work, you'll progress towards earning break charges. These grant you the ability to extend breaks by a few minutes as a reward for working hard!", actions: [] }) } }] }}>
					<ButtonActionConfig name="Charge Break" disabled={currentSession !== "break" || timerStatus === "stopped" || breakChargesLeft <= 0 || isOnCooldown || chargeUsedThisSession} button={{ text: "1", icon: faBolt }} onClick={handleUseBreakCharge}>
						<div className="groupList">
							<h3 style={{ margin: 0, marginBlockEnd: "-15px" }}>
								You have{" "}
								<b className="breakChargesCounter">
									<FontAwesomeIcon icon={faBolt} />
									{breakChargesLeft}
								</b>{" "}
								left.
							</h3>
							<p>{timeLeftTillNextCharge < 60 ? <b>Less than 1 minute</b> : timeLeftTillNextCharge === 60 ? <b>1 minute</b> : Math.ceil(timeLeftTillNextCharge / 60) === 1 ? <b>1 minute</b> : <b>{Math.ceil(timeLeftTillNextCharge / 60)} minutes</b>} of work left till your next break charge is ready!</p>
						</div>
						<div id="chargingProgress">
							<div
								style={{
									width: `${Math.min(Math.max(chargeProgressPercentage, 0), 100)}%`,
								}}
								className={isCharging ? "charging-effect" : ""}
							/>
						</div>
						{getCooldownMessage() ? (
							<p>
								<FontAwesomeIcon icon={faHourglassHalf} /> {getCooldownMessage()}
							</p>
						) : null}
					</ButtonActionConfig>
				</Container>
			) : null}
		</>
	);
};

export default Focus;
