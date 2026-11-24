"use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayYmdLisbon } from "@/lib/lisbon-payment-dates";
import {
  COACH_CONTRACT_VERSION,
  renderCoachAdhesionTerm,
  renderCoachContract,
  sectionsToText,
  validateCoachPrivateData,
} from "@/lib/coach-contract";
import { loadCoachContractFields, loadCoachOnboardingState } from "@/lib/coach-onboarding";

export type CoachAdesaoResult = { error?: string };

/** Assinatura desenhada é um PNG pequeno; 1 MB dá margem. */
const MAX_SIGNATURE_BYTES = 1024 * 1024;

async function currentCoach() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "COACH") return null;
  const db = createAdminClient();
  const { data: coach } = await db.from("Coach").select("id").eq("userId", dbUser.id).maybeSingle();
  if (!coach) return null;
  return { db, dbUser, coachId: coach.id as string };
}

export async function saveCoachPrivateData(_prev: CoachAdesaoResult | null, formData: FormData): Promise<CoachAdesaoResult> {
  const ctx = await currentCoach();
  if (!ctx) return { error: "Sessão inválida. Entra outra vez." };
  const v = validateCoachPrivateData((k) => formData.get(k), todayYmdLisbon());
  if (v.error || !v.data) return { error: v.error ?? "Dados inválidos." };

  const { error } = await ctx.db
    .from("CoachPrivateData")
    .upsert({ coachId: ctx.coachId, ...v.data, updatedAt: new Date().toISOString() }, { onConflict: "coachId" });
  if (error) return { error: "Não foi possível guardar os teus dados. Tenta outra vez." };

  revalidatePath("/professor/adesao");
  redirect("/professor/adesao?passo=assinar");
}

export async function signCoachDocuments(_prev: CoachAdesaoResult | null, formData: FormData): Promise<CoachAdesaoResult> {
  const ctx = await currentCoach();
  if (!ctx) return { error: "Sessão inválida. Entra outra vez." };
  const { db, dbUser, coachId } = ctx;

  const state = await loadCoachOnboardingState(db, coachId, dbUser.id);
  if (!state.privateData) return { error: "Preenche primeiro os teus dados." };
  const schoolId = String(formData.get("schoolId") ?? "");
  if (!state.missingSchoolIds.includes(schoolId)) return { error: "Não há documentos por assinar nesta escola." };
  if (formData.get("acceptContract") !== "on" || formData.get("acceptTerm") !== "on") {
    return { error: "Tens de aceitar o contrato e o termo de adesão." };
  }
  const signatureName = String(formData.get("signatureName") ?? "").trim().replace(/\s+/g, " ");
  if (signatureName.length < 5) return { error: "Escreve o teu nome completo para assinar." };

  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) return { error: "Assina no espaço indicado." };
  if (file.type !== "image/png" || file.size > MAX_SIGNATURE_BYTES) return { error: "Assinatura inválida." };

  // O texto assinado é sempre gerado aqui, com os dados atuais — nunca vem do browser.
  const today = todayYmdLisbon();
  const fields = await loadCoachContractFields(db, coachId, schoolId, state.privateData, today);
  if (!fields) return { error: "A escola ainda não tem os dados legais preenchidos. Fala com o Diretor Técnico." };

  const path = `coaches/${coachId}/${randomUUID()}.png`;
  const { error: upErr } = await db.storage.from("signatures").upload(path, file, { upsert: false, contentType: "image/png" });
  if (upErr) return { error: "Não foi possível guardar a assinatura. Tenta outra vez." };

  const h = await headers();
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
  const userAgent = h.get("user-agent")?.slice(0, 300) ?? null;
  const signedAt = new Date().toISOString();
  const footer = `\n\nAssinado por: ${signatureName}`;

  const { error: insErr } = await db.from("CoachDocumentSignature").insert([
    {
      coachId,
      schoolId,
      documentType: "CONTRACT",
      documentVersion: COACH_CONTRACT_VERSION,
      contentSnapshot: sectionsToText(renderCoachContract(fields)) + footer,
      signaturePath: path,
      signedAt,
      ipAddress,
      userAgent,
    },
    {
      coachId,
      schoolId,
      documentType: "ADHESION_TERM",
      documentVersion: COACH_CONTRACT_VERSION,
      contentSnapshot: sectionsToText(renderCoachAdhesionTerm(fields)) + footer,
      signaturePath: path,
      signedAt,
      ipAddress,
      userAgent,
    },
  ]);
  if (insErr) {
    if (insErr.code === "23505") redirect("/professor/adesao");
    return { error: "Não foi possível guardar os documentos assinados. Tenta outra vez." };
  }

  if (state.missingSchoolIds.length === 1) {
    await db.from("CoachPrivateData").update({ onboardingCompletedAt: signedAt }).eq("coachId", coachId);
  }

  revalidatePath("/professor/adesao");
  revalidatePath("/coach", "layout");
  redirect("/professor/adesao");
}
