import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { SignUpForm } from "./SignUpForm";

export default async function SignUpPage() {
  const locale = await getLocaleFromCookies();
  return <SignUpForm initialLocale={locale as "pt" | "en"} />;
}
