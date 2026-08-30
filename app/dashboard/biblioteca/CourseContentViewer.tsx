"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ConcluirUnidadeButton } from "./ConcluirUnidadeButton";
import { ConcluirModuloButton } from "./ConcluirModuloButton";
import { VideoPlayer } from "@/components/biblioteca/VideoPlayer";
import { UnitTextContent } from "@/components/biblioteca/UnitTextContent";
import { PdfUnitViewer } from "@/components/biblioteca/PdfUnitViewer";

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
  const unitRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
          return (
            <div key={mod.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
                Módulo {idx + 1}: {mod.name}
              </h3>
              {mod.description && (
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>{mod.description}</p>
              )}
              {units.map((u, uIdx) => {
                const prevUnit = uIdx > 0 ? units[uIdx - 1] : null;
                const isUnlocked = !prevUnit || completedUnitSet.has(prevUnit.id);
                const canExpand = lockedPreview || isUnlocked;
                const isExpanded = expandedUnits.has(u.id);

                return (
                  <div
                    key={u.id}
                    ref={(el) => {
                      if (el) unitRefs.current.set(u.id, el);
                      else unitRefs.current.delete(u.id);
                    }}
                    className="card"
                    style={{
                      padding: 0,
                      overflow: "hidden",
                      opacity: canExpand ? 1 : 0.7,
                      outline: u.id === initialOpenUnitId ? "2px solid var(--primary)" : "none",
                      outlineOffset: 2,
                      scrollMarginTop: 16,
                    }}
                  >
                    <div
                      style={{
                        padding: "clamp(12px, 3vw, 16px)",
                        borderBottom: isExpanded ? "1px solid var(--border)" : "none",
                        cursor: canExpand ? "pointer" : "default",
                      }}
                      onClick={() => canExpand && toggleUnit(u.id)}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, color: "var(--text-secondary)" }} aria-hidden>
                            {isExpanded ? "▼" : "▶"}
                          </span>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {uIdx + 1}. {u.name}
                          </span>
                        </span>
                        {!lockedPreview &&
                          studentId &&
                          (completedUnitSet.has(u.id) ? (
                            <span style={{ fontSize: 14, color: "var(--primary)", fontWeight: 500 }}>✓ Concluído</span>
                          ) : isUnlocked ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <ConcluirUnidadeButton unitId={u.id} courseId={courseId} />
                            </div>
                          ) : (
                            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                              {completePreviousUnit}
                            </span>
                          ))}
                      </div>
                      {u.description && (
                        <p style={{ margin: "6px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{u.description}</p>
                      )}
                    </div>
                    {isExpanded && canExpand && (
                      <>
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
                            ) : (
                              <div style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>{videoComingSoon}</p>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                    {isExpanded && !canExpand && (
                      <div style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>{completePreviousUnit}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
                      <span style={{ fontSize: 14, color: "var(--primary)", fontWeight: 500 }}>✓ Concluído</span>
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
