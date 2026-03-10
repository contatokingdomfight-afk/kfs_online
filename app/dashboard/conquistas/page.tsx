import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import {
  getAchievementUnlockContext,
  getAchievementsWithStatus,
} from "@/lib/achievements";
import { AchievementsGrid } from "./AchievementsGrid";

export default async function DashboardConquistasPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  const context = await getAchievementUnlockContext(supabase, studentId);
  const achievements = getAchievementsWithStatus(context);

  return (
    <div className="max-w-[min(720px,100%)] mx-auto pb-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-[var(--text-secondary)] text-sm sm:text-base font-medium no-underline hover:text-[var(--text-primary)]"
        >
          ← {t("navHome")}
        </Link>
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">
        Conquistas
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Completa desafios e desbloqueia badges ao longo do teu progresso.
      </p>

      <AchievementsGrid achievements={achievements} />
    </div>
  );
}
