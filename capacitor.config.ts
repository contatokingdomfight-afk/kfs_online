import type { CapacitorConfig } from "@capacitor/cli";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

/** URL que o WebView nativo abre (produção ou dev). Sem valor, usa ficheiros em `capacitor-www/`. */
function resolveServerUrl(): string | undefined {
  const raw =
    process.env.CAPACITOR_SERVER_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/$/, "");
}

const serverUrl = resolveServerUrl();
const cleartext = serverUrl?.startsWith("http://") === true;

const config: CapacitorConfig = {
  appId: "com.kingdomfight.school",
  appName: "Kingdom Fight School",
  webDir: "capacitor-www",
  appendUserAgent: " KFSNative/1",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext,
          androidScheme: cleartext ? "http" : "https",
        },
      }
    : {}),
  android: {
    allowMixedContent: cleartext,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#121416",
    },
  },
};

export default config;
