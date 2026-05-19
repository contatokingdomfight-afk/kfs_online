import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { requirePlan } from "@/lib/require-plan";
import { getTribeStudentWriteContext } from "@/lib/tribe/student-context";
import { loadTribeFeed } from "@/lib/tribe/feed";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { TribeAccessBlocked } from "@/components/tribe/TribeAccessBlocked";
import { TribeFeedClient } from "@/components/tribe/TribeFeedClient";

export default async function TriboPage() {
  await requirePlan();
  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);
  const gate = await getTribeStudentWriteContext();
  if (!gate.ok) {
    if (gate.error === "admin") {
      return (
        <AdminConfigMissing
          errorType={gate.adminDetail}
          backHref="/dashboard"
          backLabel={t("tribeBlockedBack")}
        />
      );
    }
    if (gate.error === "auth") {
      redirect("/sign-in?reason=tribe-no-session");
    }
    if (gate.error === "missing_school") {
      return (
        <TribeAccessBlocked
          title={t("tribeBlockedTitle")}
          message={t("tribeBlockedMissingSchool")}
          backLabel={t("tribeBlockedBack")}
        />
      );
    }
    if (gate.error === "no_plan_student") {
      redirect("/escolher-plano");
    }
    if (gate.error === "role") {
      return (
        <TribeAccessBlocked
          title={t("tribeBlockedTitle")}
          message={t("tribeBlockedWrongRole")}
          backLabel={t("tribeBlockedBack")}
        />
      );
    }
    if (gate.error === "admin_view_no_profile") {
      return (
        <TribeAccessBlocked
          title={t("tribeBlockedTitle")}
          message={t("tribeBlockedAdminViewNoProfile")}
          backLabel={t("tribeBlockedBack")}
        />
      );
    }
    if (gate.error === "student") {
      return (
        <TribeAccessBlocked
          title={t("tribeBlockedTitle")}
          message={t("tribeBlockedNoStudent")}
          backLabel={t("tribeBlockedBack")}
        />
      );
    }
    return (
      <TribeAccessBlocked
        title={t("tribeBlockedTitle")}
        message={t("tribeBlockedGeneric")}
        backLabel={t("tribeBlockedBack")}
      />
    );
  }
  const posts = await loadTribeFeed(gate.ctx);

  return (
    <main className="container-mobile py-6">
      <Suspense fallback={<div className="p-6 text-sm text-center">{t("loading")}</div>}>
        <TribeFeedClient initialPosts={posts} locale={locale} currentUserId={gate.ctx.userId} />
      </Suspense>
    </main>
  );
}
