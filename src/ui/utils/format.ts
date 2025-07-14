function formatAsTime(seconds: number): string {
	seconds = Math.trunc(Math.abs(seconds));

	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const sec = seconds % 60;

	const pad = (num: number): string => num.toString().padStart(2, "0");

	return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(sec)}` : `${mins}:${pad(sec)}`;
}

function formatAsClockTime(date: Date, type: "12hr" | "24hr" = "12hr", showSeconds: boolean = false): string {
	const hrs24 = date.getHours();
	const mins = date.getMinutes();
	const sec = date.getSeconds();

	const pad = (num: number): string => num.toString().padStart(2, "0");

	if (type === "24hr") {
		return showSeconds ? `${pad(hrs24)}:${pad(mins)}:${pad(sec)}` : `${pad(hrs24)}:${pad(mins)}`;
	}

	// 12-hour format
	const hours12 = hrs24 === 0 ? 12 : hrs24 > 12 ? hrs24 - 12 : hrs24;
	const meridiem = hrs24 < 12 ? "AM" : "PM";

	return showSeconds ? `${hours12}:${pad(mins)}:${pad(sec)} ${meridiem}` : `${hours12}:${pad(mins)} ${meridiem}`;
}

export { formatAsTime, formatAsClockTime };
