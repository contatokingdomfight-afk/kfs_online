"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, type ReactNode } from "react";
import { BookOpen, Brain, ChevronDown, ChevronLeft, ChevronRight, X, ClipboardCheck, Compass, Dumbbell, Gauge, Swords, TrendingUp, UserCheck } from "lucide-react";
import type { DimensionDetail, DetailGroup, DetailItem } from "@/lib/performance-detail-structure";

const DIMENSION_INTROS: Record<string, string> = {
  tecnico: "Postura, deslocamento, golpes, defesas e combinações.",
  tatico: "Leitura de combate, timing, distância e estratégia.",
  fisico: "Força, explosão, velocidade, resistência e mobilidade.",
  mental: "Foco, resiliência, confiança e controlo sob pressão.",
  teorico: "Regras, conceitos técnicos e táticos.",
};

const DIMENSION_STYLE: Record<string, { icon: ReactNode; color: string }> = {
  tecnico: { icon: <Swords size={20} />, color: "#f87171" },
  tatico: { icon: <Compass size={20} />, color: "#60a5fa" },
  fisico: { icon: <Dumbbell size={20} />, color: "#4ade80" },
  mental: { icon: <Brain size={20} />, color: "#c084fc" },
  teorico: { icon: <BookOpen size={20} />, color: "#facc15" },
};
const FALLBACK_STYLE = { icon: <Gauge size={20} />, color: "#94a3b8" };

function scoreColor(avg: number): string {
  if (avg <= 0) return "var(--text-secondary)";
  if (avg >= 7) return "#4ade80";
  if (avg >= 4) return "#facc15";
  return "#f87171";
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 56;
  const h = 20;
  const pad = 2;
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / range) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} aria-hidden style={{ flexShrink: 0 }}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function countCriteria(detail: DimensionDetail): number {
  return detail.groups.reduce(
    (s, g) => s + (g.subGroups?.reduce((a, sg) => a + (sg.items?.length ?? 0), 0) ?? g.items?.length ?? 0),
    0
  );
}

const chip = (active: boolean): React.CSSProperties => ({
  padding: "8px 14px",
  borderRadius: 999,
  border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
  background: active ? "var(--primary)" : "var(--bg-secondary)",
  color: active ? "#fff" : "var(--text-primary)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
});

type Props = {
  detailOrder: string[];
  detailByDimension: Record<string, DimensionDetail>;
  dimensionAverages?: Record<string, number>;
  dimensionHistory?: Record<string, number[]>;
  /** Com mais do que uma modalidade com critérios, mostra filtro «Todas» vs uma modalidade. */
  modalityOptions?: { code: string; label: string }[];
  detailByModality?: Record<string, { detailOrder: string[]; detailByDimension: Record<string, DimensionDetail> }>;
  scoresByModality?: Record<
    string,
    { dimensionAverages: Record<string, number>; dimensionHistory: Record<string, number[]> }
  >;
};

export function ComoSouAvaliadoContent({
  detailOrder,
  detailByDimension,
  dimensionAverages = {},
  dimensionHistory = {},
  modalityOptions = [],
  detailByModality = {},
  scoresByModality = {},
}: Props) {
  const [modalityFilter, setModalityFilter] = useState("");
  const [selectedDim, setSelectedDim] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const mergedView = useMemo(
    () => ({ detailOrder, detailByDimension, dimensionAverages, dimensionHistory }),
    [detailOrder, detailByDimension, dimensionAverages, dimensionHistory]
  );

  const active = useMemo(() => {
    if (!modalityFilter || !detailByModality[modalityFilter]) return mergedView;
    const bundle = detailByModality[modalityFilter];
    const sc = scoresByModality[modalityFilter];
    return {
      detailOrder: bundle.detailOrder,
      detailByDimension: bundle.detailByDimension,
      dimensionAverages: sc?.dimensionAverages ?? {},
      dimensionHistory: sc?.dimensionHistory ?? {},
    };
  }, [modalityFilter, mergedView, detailByModality, scoresByModality]);

  useEffect(() => {
    setOpenCategories(new Set());
    setSelectedDim(null);
    // Só quando o utilizador muda o filtro de modalidade — não incluir detailOrder/detailByModality
    // para não repor o estado a cada re-render com novo object identity do servidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional
  }, [modalityFilter]);

  const showModalityFilter = modalityOptions.length > 1;
  const hasScores = Object.keys(active.dimensionAverages).length > 0;
  const dims = active.detailOrder.filter((k) => active.detailByDimension[k]?.groups?.length);
  const currentDim = selectedDim && dims.includes(selectedDim) ? selectedDim : null;
  const dimIndex = currentDim ? dims.indexOf(currentDim) : -1;
  const openDim = (key: string | null) => {
    setSelectedDim(key);
    setOpenCategories(new Set());
  };

  // Painel aberto: Esc fecha e a página por trás não faz scroll.
  useEffect(() => {
    if (!currentDim) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDim(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [currentDim]);
  const detail = currentDim ? active.detailByDimension[currentDim] : null;
  const currentStyle = (currentDim && DIMENSION_STYLE[currentDim]) || FALLBACK_STYLE;

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const steps = [
    { icon: <UserCheck size={20} />, title: "O coach avalia", text: "Cada critério de 1 a 10" },
    { icon: <ClipboardCheck size={20} />, title: "Média por área", text: "Últimas 10 avaliações" },
    { icon: <TrendingUp size={20} />, title: "O teu perfil", text: "Radar, evolução e graduação" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 800 }}>Como sou avaliado</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{dims.length} áreas, notas de 1 a 10.</p>
      </header>

      {/* Como funciona */}
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {steps.map((s, i) => (
          <li
            key={s.title}
            style={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--bg-secondary)", padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}
          >
            <span aria-hidden style={{ position: "relative", width: 42, height: 42, borderRadius: 21, background: "rgba(193,18,31,0.16)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {s.icon}
              <span style={{ position: "absolute", top: -4, right: -6, width: 18, height: 18, borderRadius: 9, background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {i + 1}
              </span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{s.title}</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>{s.text}</span>
          </li>
        ))}
      </ol>

      {/* Escala */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div aria-hidden style={{ height: 10, borderRadius: 5, background: "linear-gradient(90deg, #f87171 0%, #f87171 30%, #facc15 30%, #facc15 60%, #4ade80 60%, #4ade80 100%)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>
          <span>1–3 · A trabalhar</span>
          <span>4–6 · A evoluir</span>
          <span>7–10 · Forte</span>
        </div>
      </div>

      {showModalityFilter ? (
        <div role="tablist" aria-label="Filtrar critérios por modalidade" className="swipe-carousel-scroll" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          <button type="button" role="tab" aria-selected={!modalityFilter} onClick={() => setModalityFilter("")} style={chip(!modalityFilter)}>
            Todas
          </button>
          {modalityOptions.map((m) => (
            <button key={m.code} type="button" role="tab" aria-selected={modalityFilter === m.code} onClick={() => setModalityFilter(m.code)} style={chip(modalityFilter === m.code)}>
              {m.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Áreas */}
      <section aria-label="Áreas avaliadas" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {dims.map((dimKey) => {
          const d = active.detailByDimension[dimKey];
          const st = DIMENSION_STYLE[dimKey] ?? FALLBACK_STYLE;
          const avg = active.dimensionAverages[dimKey] ?? 0;
          const history = active.dimensionHistory[dimKey] ?? [];
          const selected = dimKey === currentDim;
          return (
            <button
              key={dimKey}
              type="button"
              onClick={() => openDim(dimKey)}
              aria-haspopup="dialog"
              aria-expanded={selected}
              style={{
                borderRadius: 16,
                border: selected ? `2px solid ${st.color}` : "1px solid var(--border)",
                background: selected ? `color-mix(in srgb, ${st.color} 12%, var(--bg-secondary))` : "var(--bg-secondary)",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                textAlign: "left",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span aria-hidden style={{ width: 38, height: 38, borderRadius: 12, background: `color-mix(in srgb, ${st.color} 18%, transparent)`, color: st.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {st.icon}
                </span>
                {hasScores ? (
                  <span style={{ fontSize: 20, fontWeight: 900, color: scoreColor(avg) }}>{avg > 0 ? avg.toFixed(1) : "–"}</span>
                ) : null}
              </span>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 15, fontWeight: 800 }}>
                {d.title}
                <ChevronRight size={16} aria-hidden style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
              </span>
              {hasScores ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--bg)", overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: `${Math.min(100, (avg / 10) * 100)}%`, background: scoreColor(avg), borderRadius: 3 }} />
                  </span>
                  <Sparkline values={history} color={st.color} />
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{countCriteria(d)} critérios</span>
              )}
            </button>
          );
        })}
      </section>

      {/* Critérios da área escolhida: painel por cima (folha em baixo no telemóvel, lateral no desktop). */}
      {detail && currentDim ? (
        <div className="csa-overlay" onClick={() => setSelectedDim(null)}>
        <section
          role="dialog"
          aria-modal="true"
          aria-label={detail.title}
          className="csa-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          <span aria-hidden className="csa-grabber" />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span aria-hidden style={{ width: 44, height: 44, borderRadius: 14, background: `color-mix(in srgb, ${currentStyle.color} 18%, transparent)`, color: currentStyle.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {currentStyle.icon}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 18, fontWeight: 800 }}>{detail.title}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)" }}>
                {DIMENSION_INTROS[currentDim] ?? `${countCriteria(detail)} critérios`}
              </span>
            </span>
            {hasScores && (active.dimensionAverages[currentDim] ?? 0) > 0 ? (
              <span style={{ fontSize: 22, fontWeight: 900, color: scoreColor(active.dimensionAverages[currentDim]) }}>
                {active.dimensionAverages[currentDim].toFixed(1)}
              </span>
            ) : null}
            <button type="button" onClick={() => setSelectedDim(null)} aria-label="Fechar" className="csa-icon-btn">
              <X size={20} aria-hidden />
            </button>
          </div>

          {detail.groups.map((group: DetailGroup, gi: number) => {
            const categories = group.subGroups ?? (group.items?.length ? [group] : []);
            const modalityTitle = group.subGroups ? group.title : null;
            return (
              <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {modalityTitle ? (
                  <h3 style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: currentStyle.color }}>
                    {modalityTitle}
                  </h3>
                ) : null}
                {categories.map((cat: DetailGroup, ci: number) => {
                  const catKey = `${currentDim}-${gi}-${ci}`;
                  const open = openCategories.has(catKey);
                  const items = cat.items ?? [];
                  return (
                    <div key={ci} style={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg)", overflow: "hidden" }}>
                      <button
                        type="button"
                        onClick={() => toggleCategory(catKey)}
                        aria-expanded={open}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", textAlign: "left" }}
                      >
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{cat.title}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", padding: "2px 8px", borderRadius: 999, background: "var(--bg-secondary)" }}>{items.length}</span>
                        <ChevronDown size={18} aria-hidden style={{ color: "var(--text-secondary)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                      </button>
                      {open ? (
                        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                          {cat.note ? <p style={{ margin: 0, fontSize: 12, fontStyle: "italic", color: "var(--text-secondary)" }}>{cat.note}</p> : null}
                          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {items.map((item: string | DetailItem, ii: number) => {
                              const label = typeof item === "string" ? item : item.label;
                              const note = typeof item === "string" ? null : item.note;
                              return (
                                <li
                                  key={ii}
                                  title={note ?? undefined}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 999,
                                    border: `1px solid color-mix(in srgb, ${currentStyle.color} 40%, var(--border))`,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: note ? "help" : undefined,
                                  }}
                                >
                                  {label}
                                  {note ? <span aria-label={`Mais informações: ${note}`} style={{ marginLeft: 6, color: "var(--text-secondary)" }}>ⓘ</span> : null}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {dims.length > 1 ? (
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button type="button" className="csa-nav-btn" disabled={dimIndex <= 0} onClick={() => openDim(dims[dimIndex - 1])}>
                <ChevronLeft size={18} aria-hidden />
                {dimIndex > 0 ? active.detailByDimension[dims[dimIndex - 1]].title : ""}
              </button>
              <button type="button" className="csa-nav-btn" style={{ justifyContent: "flex-end" }} disabled={dimIndex >= dims.length - 1} onClick={() => openDim(dims[dimIndex + 1])}>
                {dimIndex < dims.length - 1 ? active.detailByDimension[dims[dimIndex + 1]].title : ""}
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>
          ) : null}
        </section>
        </div>
      ) : null}
      <style>{`
        .csa-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.55); display: flex; align-items: flex-end; justify-content: center; animation: csa-fade 0.15s ease-out; }
        .csa-sheet { width: 100%; max-height: 88vh; overflow-y: auto; scrollbar-width: none; background: var(--bg-secondary); border-radius: 22px 22px 0 0; border: 1px solid var(--border); padding: 10px 16px calc(20px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 12px; box-sizing: border-box; animation: csa-up 0.2s ease-out; }
        .csa-sheet::-webkit-scrollbar { display: none; }
        .csa-grabber { width: 40px; height: 4px; border-radius: 2px; background: var(--border); align-self: center; margin-bottom: 4px; }
        .csa-icon-btn { width: 38px; height: 38px; flex-shrink: 0; border-radius: 19px; border: 1px solid var(--border); background: var(--bg); color: var(--text-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .csa-nav-btn { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 12px; border-radius: 14px; border: 1px solid var(--border); background: var(--bg); color: var(--text-primary); font-size: 13px; font-weight: 700; cursor: pointer; }
        .csa-nav-btn:disabled { opacity: 0.35; cursor: default; }
        @media (min-width: 900px) {
          .csa-overlay { justify-content: flex-end; align-items: stretch; }
          .csa-sheet { width: 480px; max-height: none; height: 100%; border-radius: 0; border-width: 0 0 0 1px; padding: 20px; animation: csa-left 0.2s ease-out; }
          .csa-grabber { display: none; }
        }
        @keyframes csa-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes csa-up { from { transform: translateY(40px); opacity: 0.6; } to { transform: none; opacity: 1; } }
        @keyframes csa-left { from { transform: translateX(40px); opacity: 0.6; } to { transform: none; opacity: 1; } }
      `}</style>

      <Link
        href={hasScores ? "/dashboard/performance" : "/dashboard"}
        style={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--bg-secondary)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}
      >
        <span aria-hidden style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(193,18,31,0.16)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TrendingUp size={20} />
        </span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
          {hasScores ? "Ver o meu radar e evolução" : "As tuas notas aparecem aqui depois da 1.ª avaliação"}
        </span>
      </Link>
    </div>
  );
}
