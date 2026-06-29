import { VerifyEmailClient } from "./VerifyEmailClient";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";

type SearchParams = Promise<{ email?: string }>;

export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const locale = await getLocaleFromCookies();
  const email = (params.email ?? "").trim();

  return <VerifyEmailClient email={email} locale={locale as "pt" | "en"} />;
}
