import { rpeDescription, RPE_PERSONAL_HINT } from "@/lib/rpe-labels";

/** Cor de cada nota (as mesmas dos botões 1–10 do formulário de RPE). */
export function rpeTone(n: number): string {
  return n <= 3 ? "#4ade80" : n <= 6 ? "#fbbf24" : n <= 8 ? "#fb923c" : "#f87171";
}

/** Bloco recolhível «O que é o RPE?»: nome por extenso + escala completa 1–10 com cores. */
export function RpeScaleExplainer({ pt = true, defaultOpen = false }: { pt?: boolean; defaultOpen?: boolean }) {
  const t = (a: string, b: string) => (pt ? a : b);
  return (
    <details
      id="o-que-e-rpe"
      open={defaultOpen}
      style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--bg-secondary)", padding: "12px 14px", margin: "0 0 10px" }}
    >
      <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>
        {t("O que é o RPE?", "What is RPE?")}
      </summary>
      <p style={{ margin: "10px 0 12px", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>
        <strong style={{ color: "var(--text-primary)" }}>RPE</strong>{" "}
        {t(
          "= Rating of Perceived Exertion, ou «escala de esforço percebido». É uma nota de 1 a 10 sobre o esforço que tu sentiste no treino.",
          "= Rating of Perceived Exertion. A 1–10 score for how hard the session felt to you."
        )}{" "}
        {pt ? RPE_PERSONAL_HINT.pt : RPE_PERSONAL_HINT.en}
      </p>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
        {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
          <li key={n} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--text-primary)" }}>
            <span
              aria-hidden
              style={{
                width: 28,
                height: 26,
                borderRadius: 7,
                background: rpeTone(n),
                color: "#111",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
              }}
            >
              {n}
            </span>
            <span>{rpeDescription(n, pt)}</span>
          </li>
        ))}
      </ol>
      <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {t(
          "Exemplo: a mesma aula pode ser um 5 para um atleta experiente e um 8 para quem está a começar — as duas notas estão certas.",
          "Example: the same class can be a 5 for an experienced athlete and an 8 for a beginner — both are right."
        )}
      </p>
    </details>
  );
}
