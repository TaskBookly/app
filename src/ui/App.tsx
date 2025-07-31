import { useEffect, useState } from "react";
import "./styles/App.css";
import Section, { jumpToSection, clearAllHideTimeouts } from "./components/nav.tsx";
import IcoButton from "./components/core.tsx";
import { useTooltip, TooltipPortal } from "./components/Tooltip";
import { SettingsProvider } from "./components/SettingsContext";

function App() {
	const tooltip = useTooltip();
	const [isMaximized, setIsMaximized] = useState(false);
	const [platform, setPlatform] = useState<string>("");

	useEffect(() => {
		jumpToSection("focus");

		window.electron.build.getPlatform().then(setPlatform);

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
			new Audio(`assets/audio/${soundPath}`).play();
		});

		// Get initial window state
		window.electron.window.isMaximized().then((maximized: boolean) => {
			setIsMaximized(maximized);
		});

		// Listen for window state changes
		window.electron.window.onStateChanged((state: { maximized: boolean }) => {
			setIsMaximized(state.maximized);
		});

		// Cleanup function to clear timeouts when section component unmounts
		return () => {
			clearAllHideTimeouts();
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
			<div id="titlebar">
				<div id="windowControls">
					{platform !== "darwin" ? (
						<>
							<IcoButton id="wc_minimize" onClick={{ action: handleWindowMinimize }} icon="minimize" />
							<IcoButton id="wc_maximize" onClick={{ action: handleWindowMaximize }} icon={isMaximized ? "collapse_content" : "expand_content"} />
							<IcoButton id="wc_close" onClick={{ action: handleWindowClose }} icon="close" />
						</>
					) : null}
				</div>
			</div>
			<div id="appContent">
				<div id="sidebar">
					<IcoButton id="toggleSbBtn" onClick={{ action: handleToggleSidebar }} icon="menu" />

					<IcoButton onClick={{ jumpToSection: "focus" }} text="Focus" icon="lightbulb_circle" />
					<IcoButton onClick={{ jumpToSection: "settings" }} text="Settings" icon="build" />
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
