import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { requirePlan } from "@/lib/require-plan";
import { getTribeStudentWriteContext } from "@/lib/tribe/student-context";
import { loadTribeFeed } from "@/lib/tribe/feed";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { TribeFeedClient } from "@/components/tribe/TribeFeedClient";

export default async function TriboPage() {
  await requirePlan();
  const gate = await getTribeStudentWriteContext();
  if (!gate.ok) {
    if (gate.error === "admin") {
      return <AdminConfigMissing />;
    }
    redirect("/dashboard");
  }
  const posts = await loadTribeFeed(gate.ctx);
  const locale = await getLocaleFromCookies();

  return (
    <main className="container-mobile py-6">
      <Suspense fallback={<div className="p-6 text-sm text-center">{getTranslations(locale as "pt" | "en")("loading")}</div>}>
        <TribeFeedClient initialPosts={posts} locale={locale as "pt" | "en"} currentUserId={gate.ctx.userId} />
      </Suspense>
    </main>
  );
}
