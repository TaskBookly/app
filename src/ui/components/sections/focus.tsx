import React, { useEffect, useState } from "react";
import IcoButton, { Container, ActionMenu, type ActionMenuOption } from "../core";
import { ButtonActionConfig } from "../config";
import { formatAsTime, formatAsClockTime } from "../../utils/format";

const Focus: React.FC = () => {
	const [currentSession, setCurrentSession] = useState<"work" | "break" | "transition">("work");
	const [timerStatus, setTimerStatus] = useState<"counting" | "paused" | "stopped">("stopped");
	const [breakChargesLeft] = useState<number>(3);
	const [timeLeftInSession, updTime] = useState<number>(20 * 60);
	const [sessionExpectedFinishDate, updExFDate] = useState<Date>(new Date());

	useEffect(() => {
		if (window.electron?.focus?.sendStatus) {
			window.electron.focus.sendStatus(timerStatus, currentSession, timeLeftInSession);
		}
	}, [timerStatus, currentSession, timeLeftInSession]);

	useEffect(() => {
		let interval: NodeJS.Timeout;

		if (timerStatus === "counting") {
			interval = setInterval(() => {
				updTime((prevTime) => {
					if (prevTime <= 1) {
						handleStop();
						return 20 * 60; // Reset timer
					}

					return prevTime - 1;
				});
			}, 1000);
		} else if (timerStatus === "stopped") {
			updTime(20 * 60);
		}

		return () => {
			if (interval) {
				clearInterval(interval);
			}
		};
	}, [timerStatus]);

	// Timer handlers
	const handleStart = () => {
		if (timerStatus === "stopped") {
			updExFDate(new Date(Date.now() + timeLeftInSession * 1000));
			setTimerStatus("counting");
		}
	};
	const handleResume = () => {
		if (timerStatus === "paused") {
			setTimerStatus("counting");
		}
	};

	const handlePause = () => {
		if (currentSession === "work" && timerStatus === "counting") {
			setTimerStatus("paused");
		}
	};
	const handleStop = () => {
		if (timerStatus === "counting" || timerStatus === "paused") {
			setTimerStatus("stopped");
			setCurrentSession("work");
		}
	};

	const handleAddTime = (mins: number) => {
		if (currentSession === "work") {
			updTime((prevTime) => prevTime + mins * 60);
			updExFDate((prevDate) => new Date(prevDate.getTime() + mins * 60 * 1000));
		}
	};

	const workSessionAddTimeOptions: ActionMenuOption[] = [
		{ label: "1 minute", value: "60" },
		{ label: "2 minutes", value: "120" },
		{ label: "3 minutes", value: "180" },
		{ label: "4 minutes", value: "240" },
		{ label: "5 minutes", value: "300" },
		{ label: "10 minutes", value: "600" },
	];

	// Listen for IPC messages from menu bar
	useEffect(() => {
		const handleFocusAction = (action: string, data?: any) => {
			switch (action) {
				case "start":
					if (timerStatus === "stopped") {
						handleStart();
					}
					break;
				case "resume":
					if (timerStatus === "paused") {
						handleResume();
					}
					break;
				case "pause":
					if (timerStatus === "counting") {
						handlePause();
					}
					break;
				case "stop":
					handleStop();
					break;
				case "add-time":
					handleAddTime(data);
					break;
			}
		};

		// Add IPC listener
		if (window.electron?.focus?.onAction) {
			window.electron.focus.onAction(handleFocusAction);
		}

		// Cleanup function
		return () => {
			if (window.electron?.focus?.removeActionListener) {
				window.electron.focus.removeActionListener(handleFocusAction);
			}
		};
	}, [timerStatus, currentSession]);

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

						{currentSession === "work" && timerStatus !== "stopped" ? <ActionMenu options={workSessionAddTimeOptions} onOptionSelect={(value) => handleAddTime(parseInt(value) / 60)} button={<IcoButton icon="timer_arrow_up" text="Add time" />} /> : null}
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
