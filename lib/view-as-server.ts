import { cookies } from "next/headers";
import { VIEW_AS_COOKIE, type ViewAsRole } from "./view-as";

export async function getViewAsFromCookies(): Promise<ViewAsRole | null> {
  const c = await cookies();
  const value = c.get(VIEW_AS_COOKIE)?.value;
  if (value === "aluno" || value === "coach") return value;
  return null;
}
