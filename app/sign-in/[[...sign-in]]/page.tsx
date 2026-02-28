import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { SignInForm } from "./SignInForm";

export default async function SignInPage() {
  const locale = await getLocaleFromCookies();
  return <SignInForm initialLocale={locale as "pt" | "en"} />;
}
