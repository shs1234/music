import type { CapacitorConfig } from "@capacitor/cli";

// Built against a Musike server (MUSIKE_SERVER_URL=https://musike.example.com): the app then loads that instance.
// Without it, the backend runs inside the app (see web/src/native).
const serverUrl = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.MUSIKE_SERVER_URL;

const config: CapacitorConfig = {
  appId: "app.musike.android",
  appName: "Musike",
  // The web app built in Android mode: same UI, backend running on the phone (see web/src/native).
  webDir: "../web/dist-native",
  backgroundColor: "#0B0C0F",
  // Plugin results are logged in debug builds by default, and MusikeAuth returns the sign-in cookies: keep them out of logcat.
  loggingBehavior: "none",
  android: {
    // Music keeps loading while the screen is off or another app is in front.
    allowMixedContent: false,
  },
  ...(serverUrl ? { server: { url: serverUrl, cleartext: false } } : {}),
  plugins: {
    SystemBars: {
      // The app already pads itself with env(safe-area-inset-*), like on an iPhone.
      insetsHandling: "native",
      initialViewportFitValueHint: "cover",
      style: "DARK",
    },
  },
};

export default config;
