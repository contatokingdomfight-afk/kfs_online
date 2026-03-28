"use client";

import { useRouter, useSearchParams } from "next/navigation";

type School = { id: string; name: string };

export function TurmasSchoolFilter({
  schools,
  weekFallback,
}: {
  schools: School[];
  /** Segunda-feira da semana em vista (quando a URL ainda não tem `week`). */
  weekFallback?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "modalidade" ? "modalidade" : "semana";
  const weekFromUrl = searchParams.get("week")?.trim() || "";
  const effectiveWeek = weekFromUrl || (view === "semana" ? weekFallback?.trim() || "" : "");
  const school = searchParams.get("school")?.trim() || "";

  const buildUrl = (nextSchool: string) => {
    const p = new URLSearchParams();
    p.set("view", view);
    if (view === "semana" && effectiveWeek) p.set("week", effectiveWeek);
    if (nextSchool) p.set("school", nextSchool);
    return `/admin/turmas?${p.toString()}`;
  };

  return (
    <div style={{ marginBottom: "clamp(12px, 3vw, 16px)" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 320 }}>
        <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", fontWeight: 500 }}>
          Filtrar por escola
        </span>
        <select
          value={school || "__all__"}
          onChange={(e) => {
            const v = e.target.value;
            router.push(buildUrl(v === "__all__" ? "" : v));
          }}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #27272a)",
            backgroundColor: "var(--bg-secondary, #0b0b0b)",
            color: "var(--text-primary)",
            fontSize: "clamp(14px, 3.5vw, 16px)",
          }}
        >
          <option value="__all__">Todas as escolas</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
