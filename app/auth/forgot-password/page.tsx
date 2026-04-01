import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const locale = await getLocaleFromCookies();
  return <ForgotPasswordForm initialLocale={locale as "pt" | "en"} />;
}
