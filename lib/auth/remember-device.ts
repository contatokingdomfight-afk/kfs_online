import {
  REMEMBER_DEVICE_CHOICE_MAX_AGE_SEC,
  REMEMBER_DEVICE_COOKIE_NAME,
} from "@/lib/supabase/cookie-options";

/**
 * Grava a escolha «Manter-me ligado» antes do login OAuth ou password.
 * O middleware / servidor leem este cookie para aplicar `maxAge` aos cookies Supabase.
 */
export function persistRememberDeviceChoice(rememberLongSession: boolean): void {
  if (typeof document === "undefined") return;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const v = rememberLongSession ? "1" : "0";
  document.cookie = `${REMEMBER_DEVICE_COOKIE_NAME}=${v}; Path=/; Max-Age=${REMEMBER_DEVICE_CHOICE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

export function readRememberLongSessionFromDocumentCookie(): boolean {
  if (typeof document === "undefined") return true;
  const needle = `${REMEMBER_DEVICE_COOKIE_NAME}=`;
  const parts = `; ${document.cookie}`.split(`; ${needle}`);
  if (parts.length < 2) return true;
  const raw = parts.pop()?.split(";").shift();
  return raw !== "0";
}
