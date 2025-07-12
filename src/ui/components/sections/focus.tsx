import React, { useState, useEffect } from "react";
import IcoButton, { Container, ActionMenu, type ActionMenuOption } from "../core";
import { ButtonActionConfig } from "../config";
import { formatAsTime, formatAsClockTime } from "../../utils/format";

const Focus: React.FC = () => {
	const [currentSession, setCurrentSession] = useState<"work" | "break" | "transition">("work");
	const [timerStatus, setTimerStatus] = useState<"counting" | "paused" | "stopped">("stopped");
	const [breakChargesLeft, setBreakChargesLeft] = useState<number>(3);
	const [timeLeftInSession, setTimeLeftInSession] = useState<number>(20 * 60);
	const [sessionExpectedFinishDate, setSessionExpectedFinishDate] = useState<Date>(new Date());

	// Listen for timer updates from backend
	useEffect(() => {
		const cleanup = window.electron.focus.onTimerUpdate((data) => {
			setCurrentSession((data.session as "work" | "break" | "transition") || "work");
			setTimerStatus((data.status as "counting" | "paused" | "stopped") || "stopped");
			setTimeLeftInSession(data.timeLeft || 0);
			setBreakChargesLeft(data.chargesLeft || 0);

			if (data.timeLeft && data.status !== "stopped") {
				setSessionExpectedFinishDate(new Date(Date.now() + data.timeLeft * 1000));
			}
		});

		return cleanup;
	}, []);

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

	return (
		<>
			{timerStatus !== "stopped" ? (
				<Container name="focus_time">
					<div id="timerCont">
						<label id="sessionType">
							<span id="sessionTypeIcon" className="material-symbols-rounded">
								{currentSession === "work" ? "business_center" : currentSession === "break" ? "coffee" : "switch_access_2"}
							</span>
							{currentSession === "work" ? "WORKING" : currentSession === "break" ? "TAKING A BREAK" : "TRANSITIONING"}
						</label>

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
								<IcoButton text="Pause" icon="pause" disabled={currentSession === "break" || currentSession === "transition"} onClick={{ action: handlePause }} />
								<IcoButton text="Stop" icon="stop" onClick={{ action: handleStop }} />
							</>
						) : timerStatus === "paused" ? (
							<>
								<IcoButton text="Resume" icon="resume" onClick={{ action: handleResume }} />
								<IcoButton text="Stop" icon="stop" onClick={{ action: handleStop }} />
							</>
						) : (
							<IcoButton text="Start" icon="play_arrow" onClick={{ action: handleStart }} />
						)}

						{currentSession === "work" && timerStatus !== "stopped" ? <ActionMenu options={workSessionAddTimeOptions} onOptionSelect={(value) => handleAddTime(parseInt(value))} button={<IcoButton icon="timer_arrow_up" text="Add time" />} /> : null}
					</div>
				</div>
			</Container>
			<Container name="focus_breakExt">
				<ButtonActionConfig name="Break charging" description="You'll receive 'Break charges' after enough hours of working. These charges can be used once per break period and will extend them by a few minutes as a reward for working hard!" disabled={currentSession !== "break" || timerStatus === "stopped" || breakChargesLeft <= 0} button={{ text: "Charge break", icon: "bolt" }}>
					<div className="groupList">
						<h3 style={{ margin: 0, marginBlockEnd: "-5px" }}>
							You have <b>{breakChargesLeft}</b> {breakChargesLeft === 1 ? "charge" : "charges"} left.
						</h3>
						<label className="sub" style={{ opacity: "70%" }}>
							<b>40 work minutes</b> left till your next break charge is ready!
						</label>
					</div>
					<div id="chargingProgress">
						<div></div>
					</div>
				</ButtonActionConfig>
			</Container>
		</>
	);
};

export default Focus;
