import { isCapacitorNative } from "@/lib/capacitor-native";

/** Abre a URL de autorização OAuth (Google, etc.) — browser do sistema na app nativa. */
export async function openOAuthAuthorizeUrl(url: string): Promise<void> {
  if (isCapacitorNative()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, presentationStyle: "fullscreen" });
    return;
  }
  window.location.href = url;
}
