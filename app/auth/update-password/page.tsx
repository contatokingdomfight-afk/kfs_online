import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

export default async function UpdatePasswordPage() {
  const locale = await getLocaleFromCookies();
  return <UpdatePasswordForm initialLocale={locale as "pt" | "en"} />;
}
