import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App.tsx";
import { PopupProvider } from "./components/PopupProvider";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<PopupProvider>
			<App />
		</PopupProvider>
	</StrictMode>
);
