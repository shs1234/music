import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

/**
 * Android only: every build is the app's. lib/api.ts, server/src/config.ts and server/src/ytdlp.ts re-export
 * their phone versions (native/api.ts and native/shims), so no module swapping is needed.
 */
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Capacitor copies this folder into the APK (mobile/capacitor.config.ts → webDir).
  build: { outDir: "dist-native", emptyOutDir: true },
  plugins: [react(), tailwindcss()],
});
