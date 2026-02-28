import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";
import { FormularioExperimental } from "./FormularioExperimental";

type SearchParams = Promise<{ sucesso?: string }>;

export default async function AulaExperimentalPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const sucesso = params.sucesso === "1";

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} backHref="/" backLabel="← Voltar à página inicial" />;
  const supabase = result.client;
  const today = new Date().toISOString().slice(0, 10);

  const { data: lessons } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("startTime", { ascending: true })
    .limit(30);

  const lessonOptions = (lessons ?? []).map((l) => ({
    id: l.id,
    label: `${MODALITY_LABELS[l.modality] ?? l.modality} · ${formatLessonDate(l.date)} ${l.startTime}–${l.endTime}`,
  }));

  if (sucesso) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: "var(--bg)" }}>
        <div className="container-mobile">
          <h1 className="text-mobile-lg font-semibold text-center mb-3" style={{ color: "var(--text-primary)" }}>
            Pedido recebido
          </h1>
          <p className="text-mobile-base text-center mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Obrigado! A tua inscrição para a aula experimental foi registada. Entraremos em contacto em breve para confirmar.
          </p>
          <Link href="/" className="btn btn-primary w-full" style={{ textAlign: "center", textDecoration: "none" }}>
            Voltar ao início
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-6" style={{ backgroundColor: "var(--bg)", paddingTop: "clamp(24px, 6vw, 48px)" }}>
      <div className="container-mobile">
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginBottom: "clamp(16px, 4vw, 24px)",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-secondary)",
            textDecoration: "none",
          }}
        >
          ← Voltar
        </Link>
        <h1 className="text-mobile-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Aula experimental
        </h1>
        <p className="text-mobile-base mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Preenche os dados e escolhe a modalidade e data. Entraremos em contacto para confirmar a tua vaga.
        </p>
        <FormularioExperimental lessonOptions={lessonOptions} />
      </div>
    </main>
  );
}
