"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { buildKingdomTemplateDraft } from "@/lib/graduation/kingdom-muay-thai-template";
import { loadGraduationTemplate } from "@/lib/graduation/load-template";
import { normalizeTemplateDraft, type GraduationTemplateDraft } from "@/lib/graduation/template";

export type SaveGraduationTemplateResult = { error?: string; success?: boolean };
export type StarterDraftResult = { error?: string; draft?: GraduationTemplateDraft };

async function authorize(): Promise<{ userId: string } | { error: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const permErr = await adminPermissionError("admin:sistema:write");
  if (permErr) return { error: permErr };
  return { userId: dbUser.id };
}

function friendlyDbError(message: string): string {
  if (message.includes("StudentGrade")) {
    return "Não é possível remover um grau que já foi atribuído a alunos.";
  }
  if (message.includes("graduation_template_foreign_ids")) {
    return "O template contém elementos de outra modalidade. Recarrega a página e tenta de novo.";
  }
  if (message.includes("GraduationGradeCourse_courseId_fkey")) {
    return "Um dos cursos escolhidos já não existe. Remove-o e guarda de novo.";
  }
  return "Não foi possível guardar o template. Tenta de novo.";
}

export async function saveGraduationTemplate(payload: unknown): Promise<SaveGraduationTemplateResult> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };

  const normalized = normalizeTemplateDraft(payload);
  if (!normalized.ok) return { error: normalized.error };

  const result = getAdminClientOrNull();
  if (!result.client) return { error: "Configuração Supabase em falta." };

  const { error } = await result.client.rpc("save_graduation_template", {
    p_payload: normalized.draft,
    p_user_id: auth.userId,
  });
  if (error) {
    console.error("saveGraduationTemplate:", error);
    return { error: friendlyDbError(`${error.message} ${error.details ?? ""}`) };
  }

  revalidatePath("/admin/graduacao");
  revalidatePath(`/admin/graduacao/${normalized.draft.modalityCode}`);
  return { success: true };
}

/**
 * Ponto de partida para uma modalidade sem template: modelo Kingdom (Muay Thai) ou cópia de outra
 * modalidade. Devolve um rascunho com ids novos — só fica gravado quando o admin guardar.
 */
export async function getGraduationStarterDraft(
  modalityCode: string,
  source: { kind: "kingdom" } | { kind: "copy"; fromModalityCode: string }
): Promise<StarterDraftResult> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };

  const result = getAdminClientOrNull();
  if (!result.client) return { error: "Configuração Supabase em falta." };

  const { data: modality } = await result.client.from("ModalityRef").select("name").eq("code", modalityCode).maybeSingle();
  if (!modality) return { error: "Modalidade não encontrada." };
  const name = `Graduação ${modality.name}`;

  if (source.kind === "kingdom") {
    return { draft: buildKingdomTemplateDraft(modalityCode, name, randomUUID) };
  }

  const from = await loadGraduationTemplate(result.client, source.fromModalityCode);
  if (!from) return { error: "A modalidade escolhida ainda não tem template." };
  return {
    draft: {
      ...from,
      modalityCode,
      name,
      isPublished: false,
      grades: from.grades.map((g) => ({
        ...g,
        id: randomUUID(),
        items: g.items.map((i) => ({ ...i, id: randomUUID() })),
        requirements: g.requirements.map((r) => ({ ...r, id: randomUUID() })),
        // Cursos costumam ser específicos da modalidade: não são copiados.
        courses: [],
      })),
    },
  };
}
