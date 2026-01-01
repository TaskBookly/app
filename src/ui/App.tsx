import { useEffect, useRef, useState } from "react";
import "./styles/App.css";
import Section, { jumpToSection, clearAllHideTimeouts } from "./components/nav.tsx";
import IcoButton from "./components/core.tsx";
import { useTooltip, TooltipPortal } from "./components/Tooltip";
import { SettingsProvider } from "./components/SettingsContext";
import { usePopup } from "./components/PopupProvider";
import { faBars, faClose, faLightbulb, faWindowMaximize, faWindowMinimize, faWindowRestore, faWrench } from "@fortawesome/free-solid-svg-icons";
import sbIconMask from "./assets/icons/branding/iconWhite.svg";

function App() {
	const tooltip = useTooltip();
	const popup = usePopup();
	const popupRef = useRef(popup);
	const [isMaximized, setIsMaximized] = useState(false);
	const [platform, setPlatform] = useState<string>("");
	const [buildInfo, setBuildInfo] = useState<TaskBooklyBuildInfo | null>(null);

	useEffect(() => {
		popupRef.current = popup;
	}, [popup]);

	useEffect(() => {
		jumpToSection("focus");

		window.electron.build.getPlatform().then(setPlatform);
		let cancelled = false;
		window.electron.build
			.getInfo()
			.then((info) => {
				if (!cancelled) {
					setBuildInfo(info);
				}
			})
			.catch((error) => console.warn("Failed to load build info", error));

		window.electron.onJumpToSection((section: string) => {
			jumpToSection(section);
		});
		window.electron.sidebar.getState().then((collapsed: boolean) => {
			setSidebarClass(collapsed);
		});
		window.electron.sidebar.onState((collapsed: boolean) => {
			setSidebarClass(collapsed);
		});

		window.electron.sound.onplaySound((soundPath: string) => {
			const soundMap: Record<string, string> = {
				"notifs/info.ogg": new URL("./assets/audio/notifs/info.ogg", import.meta.url).href,
				"notifs/sessionComplete.ogg": new URL("./assets/audio/notifs/sessionComplete.ogg", import.meta.url).href,
				"notifs/sessionTransition.ogg": new URL("./assets/audio/notifs/sessionTransition.ogg", import.meta.url).href,
				"notifs/success.ogg": new URL("./assets/audio/notifs/success.ogg", import.meta.url).href,
				"notifs/warning.ogg": new URL("./assets/audio/notifs/warning.ogg", import.meta.url).href,
				"notifs/error.ogg": new URL("./assets/audio/notifs/error.ogg", import.meta.url).href,
			};

			const key = soundPath.replace(/^\/+/, "");
			const suffix = key.split("/").slice(-2).join("/");
			const url = soundMap[key] || soundMap[suffix] || `../assets/audio/${suffix}`;
			new Audio(url).play().catch((err) => console.warn("Audio playback failed:", err, "url:", url));
		});

		// Get initial window state
		window.electron.window.isMaximized().then((maximized: boolean) => {
			setIsMaximized(maximized);
		});

		// Listen for window state changes
		window.electron.window.onStateChanged((state: { maximized: boolean }) => {
			setIsMaximized(state.maximized);
		});

		const removeCloseRequestListener = window.electron.window.onCloseRequested(async () => {
			try {
				const confirmed = await popupRef.current.confirm({
					title: "End focus session?",
					message: "A focus session is currently active. Closing TaskBookly will stop the session and discard progress.",
					confirmLabel: "Quit TaskBookly",
					cancelLabel: "Keep Focusing",
					dismissible: false,
					intent: "danger",
				});
				await window.electron.window.submitCloseDecision(confirmed);
			} catch (error) {
				console.error("Failed to handle close confirmation:", error);
				await window.electron.window.submitCloseDecision(false);
			}
		});

		// Cleanup function to clear timeouts when section component unmounts
		return () => {
			cancelled = true;
			clearAllHideTimeouts();
			removeCloseRequestListener?.();
		};
	}, []);

	const setSidebarClass = (collapsed: boolean) => {
		const sidebar = document.getElementById("sidebar");
		if (sidebar) {
			if (collapsed) {
				sidebar.classList.add("sb-collapsed");
			} else {
				sidebar.classList.remove("sb-collapsed");
			}
		}
	};

	const handleToggleSidebar = () => {
		window.electron.sidebar.toggle();
	};

	const handleWindowMinimize = () => {
		window.electron.window.minimize();
	};

	const handleWindowMaximize = () => {
		window.electron.window.maximize();
	};

	const handleWindowClose = () => {
		window.electron.window.close();
	};

	return (
		<SettingsProvider>
			<div id="titlebar" className={platform === "darwin" ? "is-mac" : undefined}>
				{buildInfo && buildInfo.channel !== "stable" ? (
					<div id="buildInfo">
						<label id="buildInfoVersion">{`v${buildInfo.version}`}</label>
						<label id="buildInfoChannel">{buildInfo.channel}</label>
						<label id="buildInfoBuildNumber">{buildInfo.buildNumber}</label>
					</div>
				) : null}
				<div id="windowControls">
					{platform !== "darwin" ? (
						<>
							<IcoButton id="wc_minimize" onClick={{ action: handleWindowMinimize }} icon={faWindowMinimize} />
							<IcoButton id="wc_maximize" onClick={{ action: handleWindowMaximize }} icon={isMaximized ? faWindowRestore : faWindowMaximize} />
							<IcoButton id="wc_close" onClick={{ action: handleWindowClose }} icon={faClose} />
						</>
					) : null}
				</div>
			</div>
			<div id="appContent">
				<div id="sidebar">
					<div id="sbIcon" role="img" aria-label="TaskBookly icon" style={{ WebkitMaskImage: `url(${sbIconMask})`, maskImage: `url(${sbIconMask})` }}></div>
					<IcoButton id="toggleSbBtn" onClick={{ action: handleToggleSidebar }} icon={faBars} />

					<IcoButton onClick={{ jumpToSection: "focus" }} text="Focus" icon={faLightbulb} />
					<IcoButton onClick={{ jumpToSection: "settings" }} text="Settings" icon={faWrench} />
				</div>

				<div id="sectionContainer">
					<Section name="focus" displayTitle="Focus"></Section>
					<Section name="settings" displayTitle="App Settings"></Section>
				</div>
			</div>
			<TooltipPortal tooltip={tooltip} />
		</SettingsProvider>
	);
}

export default App;
