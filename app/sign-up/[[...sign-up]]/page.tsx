import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { SignUpForm } from "./SignUpForm";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignUpPage({ searchParams }: Props) {
  const locale = await getLocaleFromCookies();
  const sp = await searchParams;
  const initialNext = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : null;
  return <SignUpForm initialLocale={locale as "pt" | "en"} initialNext={initialNext} />;
}
