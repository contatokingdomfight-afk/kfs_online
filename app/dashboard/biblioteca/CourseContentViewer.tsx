"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, ChevronDown, FileText, Lock, PlayCircle, Presentation, BookOpen } from "lucide-react";
import { ConcluirUnidadeButton } from "./ConcluirUnidadeButton";
import { ConcluirModuloButton } from "./ConcluirModuloButton";
import { VideoPlayer } from "@/components/biblioteca/VideoPlayer";
import { UnitTextContent } from "@/components/biblioteca/UnitTextContent";
import { PdfUnitViewer } from "@/components/biblioteca/PdfUnitViewer";
import { SlideDeckViewer } from "@/components/biblioteca/SlideDeckViewer";

type Unit = {
  id: string;
  name: string;
  description: string | null;
  content_type: string;
  video_url: string | null;
  text_content: string | null;
  pdf_url: string | null;
  sort_order: number;
};

type Module = {
  id: string;
  name: string;
  description: string | null;
  video_url: string | null;
  sort_order: number;
};

type Props = {
  courseId: string;
  moduleList: Module[];
  unitsByModule: Record<string, Unit[]>;
  completedUnitIds: string[];
  completedModuleIds: string[];
  studentId: string | null;
  /** Aula a abrir e focar automaticamente ao entrar na página (link "Ver Aula" do Tema da Semana). */
  initialOpenUnitId?: string | null;
  videoComingSoon: string;
  completePreviousUnit: string;
  videoUnavailable: string;
  lockedPreview?: boolean;
  lockedOverlayTitle?: string;
  lockedOverlayBody?: string;
  choosePlanLabel?: string;
};

function contentTypeMeta(type: string): { icon: React.ReactNode; label: string } {
  if (type === "TEXT") return { icon: <FileText size={13} aria-hidden />, label: "Texto" };
  if (type === "PDF") return { icon: <BookOpen size={13} aria-hidden />, label: "PDF" };
  if (type === "SLIDES") return { icon: <Presentation size={13} aria-hidden />, label: "Slides" };
  return { icon: <PlayCircle size={13} aria-hidden />, label: "Vídeo" };
}

function PreviewLockedBlock({
  title,
  body,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaLabel: string;
}) {
  return (
    <div
      style={{
        padding: "clamp(16px, 4vw, 20px)",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)", fontSize: 15 }}>{title}</p>
      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.45 }}>{body}</p>
      <Link href="/escolher-plano" className="btn btn-primary" style={{ textDecoration: "none", fontSize: 14 }}>
        {ctaLabel}
      </Link>
    </div>
  );
}

export function CourseContentViewer({
  courseId,
  moduleList,
  unitsByModule,
  completedUnitIds,
  completedModuleIds,
  studentId,
  initialOpenUnitId = null,
  videoComingSoon,
  completePreviousUnit,
  videoUnavailable,
  lockedPreview = false,
  lockedOverlayTitle = "",
  lockedOverlayBody = "",
  choosePlanLabel = "",
}: Props) {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(
    () => new Set(initialOpenUnitId ? [initialOpenUnitId] : [])
  );
  const unitRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (!initialOpenUnitId) return;
    const el = unitRefs.current.get(initialOpenUnitId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const completedUnitSet = new Set(completedUnitIds);
  const completedModuleSet = new Set(completedModuleIds);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
      {moduleList.map((mod, idx) => {
        const units = unitsByModule[mod.id] ?? [];
        const hasUnits = units.length > 0;
        const isLegacy = !hasUnits && mod.video_url;

        if (hasUnits) {
          const doneInModule = units.filter((u) => completedUnitSet.has(u.id)).length;
          const modulePct = Math.round((doneInModule / units.length) * 100);
          return (
            <section key={mod.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Cabeçalho do módulo */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary)" }}>
                      Módulo {idx + 1}
                    </span>
                    <h3 style={{ margin: "2px 0 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3 }}>
                      {mod.name}
                    </h3>
                  </div>
                  {!lockedPreview && studentId ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: doneInModule === units.length ? "var(--success)" : "var(--text-secondary)", whiteSpace: "nowrap", marginTop: 2 }}>
                      {doneInModule}/{units.length}
                    </span>
                  ) : null}
                </div>
                {mod.description && (
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{mod.description}</p>
                )}
                {!lockedPreview && studentId ? (
                  <div style={{ height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ width: `${modulePct}%`, height: "100%", background: modulePct >= 100 ? "var(--success)" : "var(--primary)" }} />
                  </div>
                ) : null}
              </div>

              {/* Aulas */}
              <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {units.map((u, uIdx) => {
                  const prevUnit = uIdx > 0 ? units[uIdx - 1] : null;
                  const isUnlocked = !prevUnit || completedUnitSet.has(prevUnit.id);
                  const canExpand = lockedPreview || isUnlocked;
                  const isExpanded = expandedUnits.has(u.id);
                  const isDone = completedUnitSet.has(u.id);
                  const meta = contentTypeMeta(u.content_type);
                  const showLock = !lockedPreview && !canExpand;

                  return (
                    <li
                      key={u.id}
                      ref={(el) => {
                        if (el) unitRefs.current.set(u.id, el);
                        else unitRefs.current.delete(u.id);
                      }}
                      style={{
                        borderTop: uIdx > 0 ? "1px solid var(--border)" : "none",
                        background: isExpanded ? "var(--bg)" : "transparent",
                        outline: u.id === initialOpenUnitId ? "2px solid var(--primary)" : "none",
                        outlineOffset: -2,
                        scrollMarginTop: 16,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => canExpand && toggleUnit(u.id)}
                        aria-expanded={isExpanded}
                        disabled={!canExpand}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          border: 0,
                          background: "transparent",
                          color: "inherit",
                          textAlign: "left",
                          cursor: canExpand ? "pointer" : "not-allowed",
                          opacity: canExpand ? 1 : 0.6,
                          font: "inherit",
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 32,
                            height: 32,
                            flexShrink: 0,
                            borderRadius: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 800,
                            background: isDone ? "var(--success)" : "transparent",
                            border: isDone ? "none" : `2px solid ${showLock ? "var(--border)" : "var(--primary)"}`,
                            color: isDone ? "#fff" : showLock ? "var(--text-secondary)" : "var(--text-primary)",
                          }}
                        >
                          {isDone ? <Check size={16} /> : showLock ? <Lock size={14} /> : uIdx + 1}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{u.name}</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 3, fontSize: 12, color: "var(--text-secondary)" }}>
                            {meta.icon}
                            {meta.label}
                            {showLock ? ` · ${completePreviousUnit}` : isDone ? " · Concluída" : ""}
                          </span>
                        </span>
                        {canExpand ? (
                          <ChevronDown
                            size={18}
                            color="var(--text-secondary)"
                            aria-hidden
                            style={{ flexShrink: 0, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
                          />
                        ) : null}
                      </button>

                      {isExpanded && canExpand && (
                        <div style={{ borderTop: "1px solid var(--border)" }}>
                          {lockedPreview ? (
                            <PreviewLockedBlock title={lockedOverlayTitle} body={lockedOverlayBody} ctaLabel={choosePlanLabel} />
                          ) : (
                            <>
                              {u.content_type === "VIDEO" && u.video_url ? (
                                <VideoPlayer url={u.video_url} title={u.name} fallbackMessage={videoUnavailable} />
                              ) : u.content_type === "TEXT" && u.text_content ? (
                                <div style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                                  <UnitTextContent text={u.text_content} />
                                </div>
                              ) : u.content_type === "PDF" ? (
                                <div style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                                  <PdfUnitViewer url={u.pdf_url} title={u.name} />
                                </div>
                              ) : u.content_type === "SLIDES" ? (
                                <div style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                                  <SlideDeckViewer url={u.pdf_url} title={u.name} />
                                </div>
                              ) : (
                                <div style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>{videoComingSoon}</p>
                                </div>
                              )}
                              {(u.description || studentId) && (
                                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                                  {u.description ? (
                                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55, whiteSpace: "pre-line" }}>{u.description}</p>
                                  ) : null}
                                  {studentId ? (
                                    isDone ? (
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: "var(--success)" }}>
                                        <CheckCircle2 size={16} aria-hidden />
                                        Aula concluída
                                      </span>
                                    ) : (
                                      <div>
                                        <ConcluirUnidadeButton unitId={u.id} courseId={courseId} />
                                      </div>
                                    )
                                  ) : null}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        }

        if (isLegacy) {
          return (
            <div key={mod.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "clamp(12px, 3vw, 16px)", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {idx + 1}. {mod.name}
                  </span>
                  {!lockedPreview &&
                    studentId &&
                    (completedModuleSet.has(mod.id) ? (
                      <span style={{ fontSize: 14, color: "var(--primary)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={14} aria-hidden />Concluído</span>
                    ) : (
                      <ConcluirModuloButton moduleId={mod.id} courseId={courseId} />
                    ))}
                </div>
                {mod.description && (
                  <p style={{ margin: "6px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{mod.description}</p>
                )}
              </div>
              {lockedPreview ? (
                <PreviewLockedBlock title={lockedOverlayTitle} body={lockedOverlayBody} ctaLabel={choosePlanLabel} />
              ) : (
                <VideoPlayer url={mod.video_url!} title={mod.name} fallbackMessage={videoUnavailable} />
              )}
            </div>
          );
        }

        return (
          <div key={mod.id} className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
            <h3 style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
              Módulo {idx + 1}: {mod.name}
            </h3>
            {mod.description && (
              <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{mod.description}</p>
            )}
            <p style={{ margin: "12px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>Sem unidades ainda.</p>
          </div>
        );
      })}
    </div>
  );
}
