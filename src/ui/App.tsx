import { useEffect } from "react";
import "./styles/App.css";
import Section, { jumpToSection } from "./components/nav.tsx";
import IcoButton from "./components/core.tsx";
import { useTooltip, TooltipPortal } from "./components/Tooltip";
import { SettingsProvider } from "./components/SettingsContext";

function App() {
	const tooltip = useTooltip();

	useEffect(() => {
		// Jumps to section automatically when the app loads
		jumpToSection("focus");

		window.app.onJumpToSection((section: string) => {
			jumpToSection(section);
		});
		window.app.sidebar.getState().then((collapsed: boolean) => {
			setSidebarClass(collapsed);
		});
		window.app.sidebar.onState((collapsed: boolean) => {
			setSidebarClass(collapsed);
		});
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
		window.app.sidebar.toggle();
	};

	return (
		<SettingsProvider>
			<div id="rootFlex">
				<div id="topbar">
					<span className="topbar-title">TaskBookly</span>
				</div>
				<div id="appContent">
					<div id="sidebar">
						<button id="toggleSbBtn" onClick={handleToggleSidebar}>
							<span className="material-symbols-rounded">menu</span>
						</button>
						<IcoButton onClick={{ jumpToSection: "focus" }} text="Focus" icon="lightbulb_circle" />
						<IcoButton onClick={{ jumpToSection: "tasks" }} text="To-do" icon="priority" disabled={true} />
						<IcoButton onClick={{ jumpToSection: "settings" }} text="Settings" icon="build" />
					</div>

					<div id="sectionContainer">
						<Section name="focus" displayTitle="Focus"></Section>
						<Section name="settings" displayTitle="App Settings"></Section>
					</div>
				</div>
				<TooltipPortal tooltip={tooltip} />
			</div>
		</SettingsProvider>
	);
}

export default App;
