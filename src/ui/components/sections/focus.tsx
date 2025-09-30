import React, { useState, useEffect } from "react";
import IcoButton, { Container, ActionMenu, type ActionMenuOption } from "../core";
import { ButtonActionConfig } from "../config";
import { formatAsTime, formatAsClockTime } from "../../utils/format";
import { useSettings } from "../SettingsContext";
import { faAnglesRight, faBolt, faBriefcase, faMugSaucer, faPause, faPlay, faPlus, faStop } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Focus: React.FC = () => {
	const { getSetting } = useSettings();
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
			// Show charging effect when actively working (work session + counting)
			setIsCharging(data.session === "work" && data.status === "counting");
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

	const getCooldownMessage = () => {
		if (chargeUsedThisSession) {
			return "You've already used a charge this break session.";
		}
		if (cooldownBreaksLeft > 0) {
			return `You need to take ${cooldownBreaksLeft} more ${cooldownBreaksLeft === 1 ? "break" : "breaks"} before you can charge another break.`;
		}
		return null;
	};

	return (
		<>
			{timerStatus !== "stopped" ? (
				<Container name="focus_time">
					<div id="timerCont">
						<div id="sessionType">
							<FontAwesomeIcon icon={currentSession === "work" ? faBriefcase : currentSession === "break" ? faMugSaucer : faAnglesRight} widthAuto />
							{currentSession === "work" ? "WORKING" : currentSession === "break" ? "TAKING A BREAK" : "TRANSITIONING"}
						</div>

						<label id="sessionTimer">{formatAsTime(timeLeftInSession)}</label>
						<label id="sessionEndTime">{`Ending at ${formatAsClockTime(sessionExpectedFinishDate)}`}</label>
					</div>
				</Container>
			) : null}

			<Container name="focus_controls">
				<div className="groupList">
					<div className="buttonGroup">
						{timerStatus === "counting" ? (
							<>
								<IcoButton text="Pause" icon={faPause} disabled={currentSession === "break" || currentSession === "transition"} onClick={{ action: handlePause }} />
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

						{currentSession === "work" && timerStatus !== "stopped" ? <ActionMenu options={workSessionAddTimeOptions} onOptionSelect={(value) => handleAddTime(parseInt(value))} button={<IcoButton icon={faPlus} text="Add time" />} /> : null}
					</div>
				</div>
			</Container>
			{getSetting("breakChargingEnabled") === "true" ? (
				<Container name="focus_breakCharging">
					<ButtonActionConfig name="Break charging" description="You'll receive 'Break charges' after enough hours of working. These charges can be used once per break period and will extend them by a few minutes as a reward for working hard!" disabled={currentSession !== "break" || timerStatus === "stopped" || breakChargesLeft <= 0 || isOnCooldown || chargeUsedThisSession} button={{ text: "Use break charge", icon: faBolt }} onClick={handleUseBreakCharge}>
						<div className="groupList">
							<h3 style={{ margin: 0, marginBlockEnd: "-5px" }}>
								You have <b>{Math.max(0, breakChargesLeft)}</b> {breakChargesLeft === 1 ? "charge" : "charges"} left.
							</h3>
							<label className="sub" style={{ opacity: "70%" }}>
								{timeLeftTillNextCharge < 60 ? <b>Less than 1 minute</b> : timeLeftTillNextCharge === 60 ? <b>1 minute</b> : Math.ceil(timeLeftTillNextCharge / 60) === 1 ? <b>1 minute</b> : <b>{Math.ceil(timeLeftTillNextCharge / 60)} minutes</b>} of work left till your next break charge is ready!
							</label>
						</div>
						<div id="chargingProgress">
							<div
								style={{
									width: `${Math.min(Math.max(chargeProgressPercentage, 0), 100)}%`,
								}}
								className={isCharging ? "charging-effect" : ""}
							></div>
						</div>
						{getCooldownMessage() ? (
							<label className="sub" style={{ marginTop: "8px", display: "block", opacity: "70%" }}>
								{getCooldownMessage()}
							</label>
						) : null}
					</ButtonActionConfig>
				</Container>
			) : null}
		</>
	);
};

export default Focus;
