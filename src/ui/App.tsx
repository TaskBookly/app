import { useEffect, useState } from "react";
import "./styles/App.css";
import Section, { jumpToSection, clearAllHideTimeouts } from "./components/nav.tsx";
import IcoButton from "./components/core.tsx";
import { useTooltip, TooltipPortal } from "./components/Tooltip";
import { SettingsProvider } from "./components/SettingsContext";
import { faBars, faClose, faLightbulb, faWindowMaximize, faWindowMinimize, faWindowRestore, faWrench } from "@fortawesome/free-solid-svg-icons";

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
			new Audio(`./assets/audio/${soundPath}`).play();
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
							<IcoButton id="wc_minimize" onClick={{ action: handleWindowMinimize }} icon={faWindowMinimize} />
							<IcoButton id="wc_maximize" onClick={{ action: handleWindowMaximize }} icon={isMaximized ? faWindowRestore : faWindowMaximize} />
							<IcoButton id="wc_close" onClick={{ action: handleWindowClose }} icon={faClose} />
						</>
					) : null}
				</div>
			</div>
			<div id="appContent">
				<div id="sidebar">
					<svg id="sbIcon" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="40" height="40" viewBox="0 0 375 375" style={{ display: "block" }}>
						<g fill="currentColor" fillOpacity="1">
							<g transform="translate(7.585143, 280.777165)">
								<g>
									<path d="M 129.890625 -196.21875 C 138.179688 -196.21875 145.6875 -194.191406 152.40625 -190.140625 C 159.132812 -186.085938 164.476562 -180.695312 168.4375 -173.96875 C 172.394531 -167.238281 174.375 -159.820312 174.375 -151.71875 C 174.375 -143.800781 172.441406 -136.570312 168.578125 -130.03125 C 164.710938 -123.488281 159.507812 -118.191406 152.96875 -114.140625 C 146.425781 -110.085938 139.007812 -108.0625 130.71875 -108.0625 L 131 -41.734375 C 131 -33.628906 128.96875 -26.164062 124.90625 -19.34375 C 120.851562 -12.53125 115.460938 -7.09375 108.734375 -3.03125 C 102.015625 1.019531 94.601562 3.046875 86.5 3.046875 C 78.570312 3.046875 71.289062 1.019531 64.65625 -3.03125 C 58.03125 -7.09375 52.734375 -12.53125 48.765625 -19.34375 C 44.804688 -26.164062 42.828125 -33.628906 42.828125 -41.734375 L 42.828125 -108.0625 C 34.722656 -108.0625 27.351562 -110.085938 20.71875 -114.140625 C 14.09375 -118.191406 8.84375 -123.488281 4.96875 -130.03125 C 1.101562 -136.570312 -0.828125 -143.800781 -0.828125 -151.71875 C -0.828125 -159.820312 1.101562 -167.238281 4.96875 -173.96875 C 8.84375 -180.695312 14.09375 -186.085938 20.71875 -190.140625 C 27.351562 -194.191406 34.722656 -196.21875 42.828125 -196.21875 Z M 129.890625 -196.21875 " />
								</g>
							</g>
							<g transform="translate(186.106815, 280.777165)">
								<g>
									<path d="M 124.359375 -86.21875 C 123.441406 -86.039062 123.023438 -85.441406 123.109375 -84.421875 C 123.203125 -83.410156 123.710938 -82.90625 124.640625 -82.90625 C 132.191406 -82.90625 139.238281 -84.515625 145.78125 -87.734375 C 152.320312 -90.960938 158.078125 -95.25 163.046875 -100.59375 C 166.179688 -97.28125 168.804688 -94.148438 170.921875 -91.203125 C 173.046875 -88.253906 174.660156 -84.519531 175.765625 -80 C 176.867188 -75.488281 177.421875 -68.992188 177.421875 -60.515625 C 177.421875 -53.335938 175.625 -46.15625 172.03125 -38.96875 C 168.4375 -31.78125 163.644531 -25.238281 157.65625 -19.34375 C 151.675781 -13.445312 145.09375 -8.75 137.90625 -5.25 C 130.71875 -1.75 123.441406 0 116.078125 0 L 43.109375 0 C 35.367188 0 28.179688 -2.070312 21.546875 -6.21875 C 14.921875 -10.363281 9.625 -15.796875 5.65625 -22.515625 C 1.695312 -29.242188 -0.28125 -36.570312 -0.28125 -44.5 L -0.28125 -152.546875 C -0.28125 -160.835938 1.648438 -168.253906 5.515625 -174.796875 C 9.390625 -181.335938 14.644531 -186.539062 21.28125 -190.40625 C 27.914062 -194.28125 35.191406 -196.21875 43.109375 -196.21875 L 112.484375 -196.21875 C 122.429688 -196.21875 131.640625 -193.773438 140.109375 -188.890625 C 148.585938 -184.003906 155.359375 -177.320312 160.421875 -168.84375 C 165.492188 -160.375 168.03125 -150.890625 168.03125 -140.390625 C 168.03125 -131.734375 166.09375 -123.625 162.21875 -116.0625 C 158.351562 -108.507812 153.148438 -102.15625 146.609375 -97 C 140.066406 -91.84375 132.648438 -88.25 124.359375 -86.21875 Z M 124.359375 -86.21875 " />
								</g>
							</g>
						</g>
					</svg>
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
