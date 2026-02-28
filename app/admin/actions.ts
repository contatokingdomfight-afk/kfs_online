"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VIEW_AS_COOKIE } from "@/lib/view-as";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";

export async function setViewAsAndRedirect(formData: FormData) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const viewAs = formData.get("viewAs") as string | null;
  if (viewAs !== "aluno" && viewAs !== "coach") redirect("/admin");

  const cookieStore = await cookies();
  cookieStore.set(VIEW_AS_COOKIE, viewAs, { path: "/", maxAge: 86400, sameSite: "lax" });

  if (viewAs === "aluno") redirect("/dashboard");
  redirect("/coach");
}
