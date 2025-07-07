import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	base: "./",
	publicDir: "public",
	build: {
		outDir: "dist-react",
		assetsDir: "static",
	},
	server: {
		port: 5123,
		strictPort: true,
	},
});
