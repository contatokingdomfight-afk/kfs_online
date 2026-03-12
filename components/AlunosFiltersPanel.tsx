"use client";

import { useState } from "react";

type Props = {
  basePath: string;
  defaultValue?: string;
  status?: string;
  modality?: string;
  school?: string;
  plan?: string;
  buildQuery: (overrides: Record<string, string>) => string;
  baseFilters: Record<string, string>;
  filterStatus: string;
  filterModality: string;
  filterSchool: string;
  filterPlan: string;
  statusLabel: Record<string, string>;
  modalities: { code: string; name: string }[];
  schools: { id: string; name: string }[];
  plans: { id: string; name: string }[];
  hasSchoolFilter?: boolean;
  hasPlanFilter?: boolean;
};

export function AlunosFiltersPanel({
  basePath,
  defaultValue = "",
  status = "all",
  modality = "all",
  school = "all",
  plan = "all",
  buildQuery,
  baseFilters,
  filterStatus,
  filterModality,
  filterSchool,
  filterPlan,
  statusLabel,
  modalities,
  schools,
  plans,
  hasSchoolFilter = true,
  hasPlanFilter = true,
}: Props) {
  const [open, setOpen] = useState(
    filterStatus !== "all" || filterModality !== "all" || filterSchool !== "all" || filterPlan !== "all" || !!defaultValue
  );

  const activeCount = [
    filterStatus !== "all",
    filterModality !== "all",
    filterSchool !== "all",
    filterPlan !== "all",
    !!defaultValue.trim(),
  ].filter(Boolean).length;

  return (
    <div
      style={{
        marginBottom: "clamp(16px, 4vw, 24px)",
        padding: "clamp(12px, 3vw, 16px)",
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "12px 0",
          minHeight: 48,
          border: "none",
          background: "none",
          color: "var(--text-primary)",
          fontSize: "clamp(15px, 3.8vw, 17px)",
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "left",
          WebkitTapHighlightColor: "transparent",
        }}
        aria-expanded={open}
      >
        Filtros
        {activeCount > 0 && (
          <span
            style={{
              fontSize: 12,
              padding: "2px 8px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--primary)",
              color: "#fff",
            }}
          >
            {activeCount}
          </span>
        )}
        <span style={{ fontSize: "clamp(20px, 5vw, 24px)", lineHeight: 1, flexShrink: 0 }}>
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
          {/* Buscar */}
          <div>
            <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-primary)" }}>
              Buscar
            </p>
            <form method="get" action={basePath} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {status !== "all" && <input type="hidden" name="status" value={status} />}
              {modality !== "all" && <input type="hidden" name="modality" value={modality} />}
              {school !== "all" && <input type="hidden" name="school" value={school} />}
              {plan !== "all" && <input type="hidden" name="plan" value={plan} />}
              <input
                type="search"
                name="q"
                defaultValue={defaultValue}
                placeholder="Nome, email ou telefone"
                style={{
                  flex: "1 1 200px",
                  minWidth: 0,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg)",
                  color: "var(--text-primary)",
                }}
                aria-label="Buscar por nome, email ou telefone"
              />
              <button type="submit" className="btn btn-secondary">
                Buscar
              </button>
            </form>
          </div>

          {/* Status */}
          <div>
            <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-primary)" }}>
              Status
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a
                href={`${basePath}${buildQuery({ ...baseFilters, status: "all" })}`}
                className="btn"
                style={{
                  textDecoration: "none",
                  backgroundColor: filterStatus === "all" ? "var(--primary)" : "var(--bg-secondary)",
                  color: filterStatus === "all" ? "#fff" : "var(--text-primary)",
                }}
              >
                Todos
              </a>
              {(["ATIVO", "INATIVO", "EXPERIMENTAL"] as const).map((s) => (
                <a
                  key={s}
                  href={`${basePath}${buildQuery({ ...baseFilters, status: s })}`}
                  className="btn"
                  style={{
                    textDecoration: "none",
                    backgroundColor: filterStatus === s ? "var(--primary)" : "var(--bg-secondary)",
                    color: filterStatus === s ? "#fff" : "var(--text-primary)",
                  }}
                >
                  {statusLabel[s]}
                </a>
              ))}
            </div>
          </div>

          {/* Modalidade */}
          <div>
            <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-primary)" }}>
              Modalidade
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a
                href={`${basePath}${buildQuery({ ...baseFilters, modality: "all" })}`}
                className="btn"
                style={{
                  textDecoration: "none",
                  backgroundColor: filterModality === "all" ? "var(--primary)" : "var(--bg-secondary)",
                  color: filterModality === "all" ? "#fff" : "var(--text-primary)",
                }}
              >
                Todas
              </a>
              {modalities.map((m) => (
                <a
                  key={m.code}
                  href={`${basePath}${buildQuery({ ...baseFilters, modality: m.code })}`}
                  className="btn"
                  style={{
                    textDecoration: "none",
                    backgroundColor: filterModality === m.code ? "var(--primary)" : "var(--bg-secondary)",
                    color: filterModality === m.code ? "#fff" : "var(--text-primary)",
                  }}
                >
                  {m.name}
                </a>
              ))}
            </div>
          </div>

          {hasSchoolFilter && (
            <div>
              <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-primary)" }}>
                Escola
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a
                  href={`${basePath}${buildQuery({ ...baseFilters, school: "all" })}`}
                  className="btn"
                  style={{
                    textDecoration: "none",
                    backgroundColor: filterSchool === "all" ? "var(--primary)" : "var(--bg-secondary)",
                    color: filterSchool === "all" ? "#fff" : "var(--text-primary)",
                  }}
                >
                  Todas
                </a>
                {schools.map((s) => (
                  <a
                    key={s.id}
                    href={`${basePath}${buildQuery({ ...baseFilters, school: s.id })}`}
                    className="btn"
                    style={{
                      textDecoration: "none",
                      backgroundColor: filterSchool === s.id ? "var(--primary)" : "var(--bg-secondary)",
                      color: filterSchool === s.id ? "#fff" : "var(--text-primary)",
                    }}
                  >
                    {s.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {hasPlanFilter && (
            <div>
              <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-primary)" }}>
                Plano
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a
                  href={`${basePath}${buildQuery({ ...baseFilters, plan: "all" })}`}
                  className="btn"
                  style={{
                    textDecoration: "none",
                    backgroundColor: filterPlan === "all" ? "var(--primary)" : "var(--bg)",
                    color: filterPlan === "all" ? "#fff" : "var(--text-primary)",
                  }}
                >
                  Todos
                </a>
                <a
                  href={`${basePath}${buildQuery({ ...baseFilters, plan: "none" })}`}
                  className="btn"
                  style={{
                    textDecoration: "none",
                    backgroundColor: filterPlan === "none" ? "var(--primary)" : "var(--bg-secondary)",
                    color: filterPlan === "none" ? "#fff" : "var(--text-primary)",
                  }}
                >
                  Sem plano
                </a>
                {plans.map((p) => (
                  <a
                    key={p.id}
                    href={`${basePath}${buildQuery({ ...baseFilters, plan: p.id })}`}
                    className="btn"
                    style={{
                      textDecoration: "none",
                      backgroundColor: filterPlan === p.id ? "var(--primary)" : "var(--bg-secondary)",
                      color: filterPlan === p.id ? "#fff" : "var(--text-primary)",
                    }}
                  >
                    {p.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
