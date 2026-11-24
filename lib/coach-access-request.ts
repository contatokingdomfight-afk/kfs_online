/**
 * Pedido de acesso como professor (registo via Google → Diretor Técnico aprova).
 * Regras puras (sem BD) para validar o que vem do formulário do professor e do diretor.
 */

export type CoachAccessRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

/** Máximo de modalidades num pedido (evita listas absurdas vindas de um formulário adulterado). */
export const COACH_REQUEST_MAX_MODALITIES = 12;

/**
 * Modalidades escolhidas: tira vazios e repetidos, e só aceita as que a escola oferece.
 * Devolve erro se nenhuma for válida ou se vier alguma que a escola não tem.
 */
export function normalizeCoachModalityCodes(
  raw: readonly unknown[],
  offered: ReadonlySet<string>
): { codes: string[]; error?: string } {
  const codes = [
    ...new Set(raw.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean)),
  ];
  if (codes.length === 0) return { codes: [], error: "Escolhe pelo menos uma modalidade." };
  if (codes.length > COACH_REQUEST_MAX_MODALITIES) return { codes: [], error: "Demasiadas modalidades escolhidas." };
  const unknown = codes.filter((c) => !offered.has(c));
  if (unknown.length > 0) return { codes: [], error: "Escolhe só modalidades que esta escola oferece." };
  return { codes };
}

/** Telemóvel opcional: guarda só dígitos, espaços e «+»; recusa se tiver menos de 9 dígitos. */
export function normalizeCoachPhone(raw: unknown): { phone: string | null; error?: string } {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return { phone: null };
  const cleaned = s.replace(/[^\d+ ]/g, "").replace(/\s+/g, " ").trim();
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return { phone: null, error: "Telemóvel inválido." };
  return { phone: cleaned };
}

/** Só um pedido pendente pode ser decidido; aprovado/recusado/cancelado já está fechado. */
export function canDecideCoachRequest(status: string | null | undefined): boolean {
  return status === "PENDING";
}
