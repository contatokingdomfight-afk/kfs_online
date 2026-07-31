import { Footer } from "@/components/home/Footer";
import { getHomeContent } from "@/lib/home-content";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";

export async function PublicSiteFooter() {
  const locale = (await getLocaleFromCookies()) === "en" ? "en" : "pt";
  return <Footer content={getHomeContent(locale)} />;
}
