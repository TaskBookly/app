import { useEffect } from "react";
import "./styles/App.css";
import Section, { jumpToSection, clearAllHideTimeouts } from "./components/nav.tsx";
import IcoButton from "./components/core.tsx";
import { useTooltip, TooltipPortal } from "./components/Tooltip";
import { SettingsProvider } from "./components/SettingsContext";

function App() {
	const tooltip = useTooltip();

	useEffect(() => {
		// Jumps to section automatically when the app loads
		jumpToSection("focus");

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

	return (
		<SettingsProvider>
			<div id="topbar"></div>
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
