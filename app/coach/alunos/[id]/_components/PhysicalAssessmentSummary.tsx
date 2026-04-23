import Link from "next/link";
import { IllustrativeBodyAvatar } from "@/components/IllustrativeBodyAvatar";
import { hasIllustrativeAnthropometry } from "@/lib/illustrative-body-silhouette";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

type Props = { studentId: string };

export async function PhysicalAssessmentSummary({ studentId }: Props) {
  const result = getAdminClientOrNull();
  if (!result.client) {
    return (
      <section
        className="card"
        style={{
          marginTop: "clamp(16px, 4vw, 20px)",
          padding: "clamp(20px, 5vw, 24px)",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Avaliação física
        </h2>
        <p style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
          Ficha de anamnese e avaliação inicial. Obrigatória a cada 6 meses. O resumo da última avaliação não pôde ser
          mostrado aqui; usa o atalho acima ou este botão para abrir a ficha.
        </p>
        <Link
          href={`/coach/alunos/${studentId}/avaliacao-fisica`}
          className="btn btn-primary"
          style={{ textDecoration: "none", alignSelf: "flex-start" }}
        >
          Realizar avaliação física
        </Link>
      </section>
    );
  }
  const supabase = result.client;

  const { data: lastAssessment } = await supabase
    .from("StudentPhysicalAssessment")
    .select("assessedAt, nextDueAt, clearance, formData")
    .eq("studentId", studentId)
    .order("assessedAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const assessmentDue = !lastAssessment || (lastAssessment.nextDueAt != null && lastAssessment.nextDueAt <= today);

  return (
    <section
      className="card"
      style={{
        marginTop: "clamp(16px, 4vw, 20px)",
        padding: "clamp(20px, 5vw, 24px)",
      }}
    >
      <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Avaliação física
      </h2>
      <p style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
        Ficha de anamnese e avaliação inicial. Obrigatória a cada 6 meses.
      </p>
      {lastAssessment ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(16px, 4vw, 24px)",
            alignItems: "flex-start",
            marginBottom: "12px",
          }}
        >
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-primary)" }}>
              Última: {String(lastAssessment.assessedAt).slice(0, 10)}
              {lastAssessment.clearance &&
                ` · ${lastAssessment.clearance === "APTO" ? "Apto" : lastAssessment.clearance === "APTO_RESTRICOES" ? "Apto c/ restrições" : "Aval. médica"}`}
            </p>
            <p style={{ margin: 0, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
              Próxima renovação: {String(lastAssessment.nextDueAt).slice(0, 10)}
              {assessmentDue && " (em atraso)"}
            </p>
          </div>
          {hasIllustrativeAnthropometry(
            (lastAssessment.formData ?? {}) as Partial<PhysicalAssessmentFormData>
          ) && (
            <div style={{ flexShrink: 0, maxWidth: "min(160px, 42vw)" }}>
              <IllustrativeBodyAvatar
                formData={lastAssessment.formData}
                assessedAtLabel={String(lastAssessment.assessedAt).slice(0, 10)}
              />
            </div>
          )}
        </div>
      ) : (
        <p style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
          Nenhuma avaliação física registada.
        </p>
      )}
      <Link
        href={`/coach/alunos/${studentId}/avaliacao-fisica`}
        className="btn btn-primary"
        style={{ textDecoration: "none", alignSelf: "flex-start" }}
      >
        {lastAssessment ? "Nova avaliação física" : "Realizar avaliação física"}
      </Link>
    </section>
  );
}
