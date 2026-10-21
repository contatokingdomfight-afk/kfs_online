import Link from "next/link";
import type { CSSProperties } from "react";
import { Search } from "lucide-react";
import { AlunoProfileLink } from "@/components/AlunoProfileLink";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { AlunosFiltersPanel } from "@/components/AlunosFiltersPanel";
import { studentPaymentReference } from "@/lib/revolut/match";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { computeInsuranceStatus, INSURANCE_STATUS_LABEL } from "@/lib/insurance-settings";
import { formatInTimeZone } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";
import { addDaysYmd, daysBetween, isTuitionOverdue, RISK_DAYS } from "@/lib/admin-todo-rules";
import { fetchAllPages, inChunks } from "@/lib/graduation/queries";

const INSURANCE_FILTER_LABEL: Record<string, string> = {
  expired: "Seguro expirado",
  expiring: "A expirar",
  none: "Sem cobertura",
};

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INADIMPLENTE: "Inadimplente",
  INATIVO: "Inativo",
  EXPERIMENTAL: "Experimental",
};

/** Filtros rápidos (botões no topo da lista). */
const VIEWS = [
  { id: "all", label: "Todos" },
  { id: "ativos", label: "Ativos" },
  { id: "atraso", label: "Mensalidade em atraso" },
  { id: "taxas", label: "Seguro/matrícula por pagar" },
  { id: "sem-treino", label: `Sem treinar há ${RISK_DAYS}+ dias` },
  { id: "sem-plano", label: "Sem plano" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

/** Janela para o «último treino» (mais antigo do que isto aparece como «há mais de 4 meses»). */
const TRAINING_LOOKBACK_DAYS = 120;

const eur = (n: number) => `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;

type SearchParams = Promise<{ status?: string; modality?: string; school?: string; plan?: string; q?: string; insurance?: string; vista?: string }>;

export default async function AdminAlunosPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const filterStatus = params.status ?? "all";
  const filterModality = params.modality ?? "all";
  const filterSchool = params.school ?? "all";
  const filterPlan = params.plan ?? "all";
  const filterInsurance = params.insurance ?? "all";
  const view: ViewId = VIEWS.some((v) => v.id === params.vista) ? (params.vista as ViewId) : "all";
  const searchQuery = (params.q ?? "").trim().toLowerCase();
  const todayYmd = formatInTimeZone(new Date(), LISBON_TZ, "yyyy-MM-dd");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [{ data: schools }, { data: studentsData }, { data: plansData }, modalitiesForFilter, latePayments, recentAttendance] = await Promise.all([
    supabase.from("School").select("id, name").eq("isActive", true).order("name", { ascending: true }),
    supabase.from("Student").select("id, userId, status, primaryModality, schoolId, planId, createdAt, registrationMode, syntheticLoginEmail, paymentCode").order("createdAt", { ascending: false }),
    supabase.from("Plan").select("id, name").eq("isActive", true).order("name", { ascending: true }),
    getCachedModalityRefs(supabase),
    fetchAllPages<{ studentId: string; amount: number | string; paymentType: string; referenceMonth: string | null }>((from, to) =>
      supabase
        .from("Payment")
        .select("studentId, amount, paymentType, referenceMonth")
        .eq("status", "LATE")
        .in("paymentType", ["TUITION", "INSURANCE", "ENROLLMENT"])
        .order("id")
        .range(from, to)
    ),
    fetchAllPages<{ studentId: string; occurrenceDate: string }>((from, to) =>
      supabase
        .from("Attendance")
        .select("studentId, occurrenceDate")
        .eq("status", "CONFIRMED")
        .gte("occurrenceDate", addDaysYmd(todayYmd, -TRAINING_LOOKBACK_DAYS))
        .lte("occurrenceDate", todayYmd)
        .order("id")
        .range(from, to)
    ),
  ]);

  const students = studentsData ?? [];
  let filtered = students;
  if (filterStatus !== "all") {
    filtered = filtered.filter((s) => s.status === filterStatus);
  }
  if (filterModality !== "all") {
    filtered = filtered.filter(
      (s) => (s as { primaryModality?: string | null }).primaryModality === filterModality
    );
  }
  if (filterSchool !== "all") {
    filtered = filtered.filter((s) => s.schoolId === filterSchool);
  }
  if (filterPlan !== "all") {
    if (filterPlan === "none") {
      filtered = filtered.filter((s) => !(s as { planId?: string | null }).planId);
    } else {
      filtered = filtered.filter((s) => (s as { planId?: string | null }).planId === filterPlan);
    }
  }

  const userIds = [...new Set(filtered.map((s) => s.userId))];
  const studentIds = filtered.map((s) => s.id);

  const [usersData, profilesData, insuranceData] = await Promise.all([
    inChunks(userIds, async (ids) => (await supabase.from("User").select("id, name, email").in("id", ids)).data ?? []),
    inChunks(studentIds, async (ids) => (await supabase.from("StudentProfile").select("studentId, phone").in("studentId", ids)).data ?? []),
    inChunks(studentIds, async (ids) =>
      (await supabase.from("StudentInsuranceCoverage").select("studentId, covered, coverageStartDate, coverageEndDate").in("studentId", ids)).data ?? []
    ),
  ]);

  const userById = new Map(usersData.map((u) => [u.id, u]));
  const profileByStudentId = new Map(profilesData.map((p) => [p.studentId, p]));
  const insuranceByStudentId = new Map(insuranceData.map((r) => [r.studentId, r]));
  const insuranceStatusOf = (studentId: string) => {
    const row = insuranceByStudentId.get(studentId);
    return computeInsuranceStatus(
      row
        ? {
            covered: Boolean(row.covered),
            coverageStartDate: (row.coverageStartDate as string | null) ?? null,
            coverageEndDate: (row.coverageEndDate as string | null) ?? null,
            policyReference: null,
            notes: null,
          }
        : null,
      todayYmd
    );
  };

  // Pagamentos em atraso (mesmos critérios do «A tratar hoje»: mensalidade só em atraso depois do dia 8).
  const tuitionLateBy = new Map<string, number>();
  const feesLateBy = new Map<string, number>();
  for (const p of latePayments) {
    const amount = Number(p.amount) || 0;
    if (p.paymentType === "TUITION") {
      const ref = p.referenceMonth ? String(p.referenceMonth).slice(0, 7) : null;
      if (ref && !isTuitionOverdue(todayYmd, ref)) continue;
      tuitionLateBy.set(p.studentId, (tuitionLateBy.get(p.studentId) ?? 0) + amount);
    } else {
      feesLateBy.set(p.studentId, (feesLateBy.get(p.studentId) ?? 0) + amount);
    }
  }
  const lastTrainingBy = new Map<string, string>();
  for (const a of recentAttendance) {
    const d = String(a.occurrenceDate).slice(0, 10);
    const prev = lastTrainingBy.get(a.studentId);
    if (!prev || d > prev) lastTrainingBy.set(a.studentId, d);
  }
  const daysSinceTraining = (studentId: string) => {
    const last = lastTrainingBy.get(studentId);
    return last ? daysBetween(last, todayYmd) : null;
  };

  if (filterInsurance !== "all") {
    filtered = filtered.filter((s) => {
      const st = insuranceStatusOf(s.id);
      if (filterInsurance === "expired") return st === "expired";
      if (filterInsurance === "expiring") return st === "expiring";
      if (filterInsurance === "none") return st === "none";
      return true;
    });
  }

  if (searchQuery) {
    const qNorm = searchQuery.replace(/\s/g, "");
    filtered = filtered.filter((s) => {
      const u = userById.get(s.userId);
      const p = profileByStudentId.get(s.id);
      const name = (u?.name ?? "").toLowerCase();
      const email = (u?.email ?? "").toLowerCase();
      const phone = (p?.phone ?? "").replace(/\s/g, "");
      const code = studentPaymentReference((s as { paymentCode?: number | null }).paymentCode ?? null)?.toLowerCase() ?? "";
      const codeDigits = code.replace(/\D/g, "");
      return (
        name.includes(searchQuery) ||
        email.includes(searchQuery) ||
        (qNorm && phone.includes(qNorm)) ||
        (code !== "" && (code.includes(searchQuery) || (/^\d{3,6}$/.test(qNorm) && codeDigits === qNorm.padStart(4, "0"))))
      );
    });
  }

  const matchesView = (s: (typeof students)[number], v: ViewId) => {
    const planId = (s as { planId?: string | null }).planId;
    switch (v) {
      case "ativos":
        return s.status === "ATIVO";
      case "atraso":
        return (tuitionLateBy.get(s.id) ?? 0) > 0;
      case "taxas":
        return (feesLateBy.get(s.id) ?? 0) > 0;
      case "sem-treino": {
        if (s.status !== "ATIVO") return false;
        const d = daysSinceTraining(s.id);
        return d == null || d >= RISK_DAYS;
      }
      case "sem-plano":
        return !planId && s.status !== "INATIVO";
      default:
        return true;
    }
  };
  const viewCounts = Object.fromEntries(VIEWS.map((v) => [v.id, filtered.filter((s) => matchesView(s, v.id)).length])) as Record<ViewId, number>;
  filtered = filtered.filter((s) => matchesView(s, view));

  filtered = [...filtered].sort((a, b) => {
    const nameA = userById.get(a.userId)?.name ?? "";
    const nameB = userById.get(b.userId)?.name ?? "";
    return nameA.localeCompare(nameB, "pt", { sensitivity: "base" });
  });

  const baseFilters = {
    status: filterStatus,
    modality: filterModality,
    school: filterSchool,
    plan: filterPlan,
    q: params.q ?? "",
    insurance: filterInsurance,
    vista: view,
  };
  const hrefWith = (overrides: Partial<typeof baseFilters>) => {
    const f = { ...baseFilters, ...overrides };
    const q = new URLSearchParams();
    if (f.status !== "all") q.set("status", f.status);
    if (f.modality !== "all") q.set("modality", f.modality);
    if (f.school !== "all") q.set("school", f.school);
    if (f.plan !== "all") q.set("plan", f.plan);
    if (f.q) q.set("q", f.q);
    if (f.insurance !== "all") q.set("insurance", f.insurance);
    if (f.vista !== "all") q.set("vista", f.vista);
    return `/admin/alunos${q.toString() ? `?${q}` : ""}`;
  };

  const schoolById = new Map((schools ?? []).map((s) => [s.id, s.name]));
  const planById = new Map((plansData ?? []).map((p) => [p.id, p.name]));
  const csvRows = filtered.map((s) => {
    const u = userById.get(s.userId);
    const prof = profileByStudentId.get(s.id);
    const planId = (s as { planId?: string | null }).planId;
    return {
      nome: u?.name ?? "",
      email: u?.email ?? "",
      telefone: (prof as { phone?: string | null } | undefined)?.phone ?? "",
      escola: schoolById.get(s.schoolId) ?? "",
      plano: planId ? (planById.get(planId) ?? planId) : "",
      status: STATUS_LABEL[s.status] ?? s.status,
      seguro: INSURANCE_STATUS_LABEL[insuranceStatusOf(s.id)],
      mensalidadeEmAtraso: tuitionLateBy.get(s.id) ?? 0,
      ultimoTreino: lastTrainingBy.get(s.id) ?? "",
      criadoEm: String((s as { createdAt?: string }).createdAt ?? "").slice(0, 10),
    };
  });

  const pill = (bg: string, color: string): CSSProperties => ({
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    backgroundColor: bg,
    color,
    fontWeight: 600,
    whiteSpace: "nowrap",
  });
  const tint = (c: string) => `color-mix(in srgb, ${c} 14%, transparent)`;

  return (
    <div style={{ maxWidth: "min(760px, 100%)", paddingTop: 8 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(10px, 3vw, 14px)",
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 800, color: "var(--text-primary)" }}>
          Alunos
        </h1>
        <Link
          href="/admin/alunos/novo"
          className="btn btn-primary"
          style={{ marginLeft: "auto", textDecoration: "none" }}
        >
          Novo aluno
        </Link>
        <Link href="/admin/alunos/novo?mode=avulsa" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          Aula avulsa
        </Link>
      </div>

      {/* Pesquisa sempre visível */}
      <form method="get" action="/admin/alunos" role="search" style={{ position: "relative", marginBottom: 12 }}>
        {Object.entries(baseFilters)
          .filter(([k, v]) => k !== "q" && v && v !== "all")
          .map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        <Search size={18} aria-hidden style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Procurar por nome, email ou telefone"
          aria-label="Procurar aluno por nome, email ou telefone"
          className="input"
          style={{ width: "100%", paddingLeft: 40, minHeight: 46, fontSize: 16 }}
        />
      </form>

      {/* Filtros rápidos */}
      <nav aria-label="Filtros rápidos" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {VIEWS.map((v) => {
          const active = view === v.id;
          const n = viewCounts[v.id];
          const alert = (v.id === "atraso" || v.id === "taxas" || v.id === "sem-treino") && n > 0;
          return (
            <Link
              key={v.id}
              href={hrefWith({ vista: v.id })}
              aria-current={active ? "true" : undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                padding: "7px 12px",
                borderRadius: 999,
                textDecoration: "none",
                border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                backgroundColor: active ? "var(--primary)" : "var(--bg-secondary)",
                color: active ? "#fff" : "var(--text-primary)",
              }}
            >
              {v.label}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "0 6px",
                  borderRadius: 999,
                  backgroundColor: active ? "rgba(255,255,255,0.25)" : alert ? tint("var(--danger)") : "var(--bg)",
                  color: active ? "#fff" : alert ? "var(--danger)" : "var(--text-secondary)",
                }}
              >
                {n}
              </span>
            </Link>
          );
        })}
      </nav>

      <AlunosFiltersPanel
        basePath="/admin/alunos"
        defaultValue={params.q ?? ""}
        status={filterStatus}
        modality={filterModality}
        school={filterSchool}
        plan={filterPlan}
        baseFilters={baseFilters}
        filterStatus={filterStatus}
        filterModality={filterModality}
        filterSchool={filterSchool}
        filterPlan={filterPlan}
        statusLabel={STATUS_LABEL}
        modalities={modalitiesForFilter}
        schools={schools ?? []}
        plans={plansData ?? []}
        showSearch={false}
        title="Mais filtros"
      >
        <div>
          <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-primary)" }}>
            Cobertura do seguro
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(["all", "expired", "expiring", "none"] as const).map((key) => {
              const active = filterInsurance === key;
              return (
                <Link
                  key={key}
                  href={hrefWith({ insurance: key })}
                  className="btn"
                  style={{
                    textDecoration: "none",
                    backgroundColor: active ? "var(--primary)" : "var(--bg-secondary)",
                    color: active ? "#fff" : "var(--text-primary)",
                  }}
                >
                  {key === "all" ? "Todos" : INSURANCE_FILTER_LABEL[key] ?? key}
                </Link>
              );
            })}
          </div>
        </div>
      </AlunosFiltersPanel>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {filtered.length} {filtered.length === 1 ? "aluno" : "alunos"}
        </span>
        <ExportCsvButton rows={csvRows} filename="alunos-kfs.csv" />
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          {students.length === 0
            ? "Ainda não há alunos cadastrados."
            : "Nenhum aluno com este filtro."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((s) => {
            const u = userById.get(s.userId);
            const primMod = (s as { primaryModality?: string | null }).primaryModality;
            const planId = (s as { planId?: string | null }).planId;
            const planName = planId ? (planById.get(planId) ?? "Plano") : null;
            const insStatus = insuranceStatusOf(s.id);
            const insColor =
              insStatus === "covered"
                ? "#16a34a"
                : insStatus === "expiring"
                  ? "#ca8a04"
                  : insStatus === "expired"
                    ? "var(--danger)"
                    : "var(--text-secondary)";
            const registrationMode = (s as { registrationMode?: string }).registrationMode;
            const syntheticLoginEmail = (s as { syntheticLoginEmail?: boolean }).syntheticLoginEmail === true;

            const tuitionLate = tuitionLateBy.get(s.id) ?? 0;
            const feesLate = feesLateBy.get(s.id) ?? 0;
            const payment =
              tuitionLate > 0
                ? { text: `${eur(tuitionLate)} em atraso`, color: "var(--danger)" }
                : feesLate > 0
                  ? { text: `Seguro/matrícula por pagar · ${eur(feesLate)}`, color: "#ca8a04" }
                  : planId
                    ? { text: "Pagamentos em dia", color: "#16a34a" }
                    : null;

            const days = daysSinceTraining(s.id);
            const trainingAtRisk = s.status === "ATIVO" && (days == null || days >= RISK_DAYS);
            const training =
              days == null
                ? "Sem treinos há mais de 4 meses"
                : days === 0
                  ? "Treinou hoje"
                  : days === 1
                    ? "Treinou ontem"
                    : `Último treino há ${days} dias`;

            return (
              <li key={s.id}>
                <AlunoProfileLink
                  href={`/admin/alunos/${s.id}`}
                  className="card"
                  style={{
                    display: "block",
                    padding: "clamp(12px, 3.2vw, 16px)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 700, color: "var(--text-primary)", marginRight: 2 }}>
                      {u?.name || "—"}
                    </span>
                    <span style={pill("var(--bg)", "var(--text-secondary)")}>{STATUS_LABEL[s.status] ?? s.status}</span>
                    {primMod && (
                      <span style={pill("var(--surface)", "var(--text-primary)")}>
                        {modalitiesForFilter.find((x) => x.code === primMod)?.name ?? primMod}
                      </span>
                    )}
                    <span style={pill("var(--bg)", insColor)}>{INSURANCE_STATUS_LABEL[insStatus]}</span>
                    {registrationMode === "PRESENTIAL" && (
                      <span title="Conta criada pela secretaria com senha inicial" style={pill("var(--surface)", "var(--text-secondary)")}>
                        Presencial
                      </span>
                    )}
                    {syntheticLoginEmail && (
                      <span title="Login com email gerado pela secretaria; contacto do responsável no perfil" style={pill("var(--surface)", "var(--text-secondary)")}>
                        Email interno
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 14px", marginTop: 8, fontSize: 13 }}>
                    <span style={{ color: planName ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: 600 }}>{planName ?? "Sem plano"}</span>
                    {payment ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: payment.color, fontWeight: 600 }}>
                        <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: payment.color }} />
                        {payment.text}
                      </span>
                    ) : null}
                    {s.status !== "INATIVO" ? (
                      <span style={{ color: trainingAtRisk ? "var(--danger)" : "var(--text-secondary)", fontWeight: trainingAtRisk ? 600 : 400 }}>{training}</span>
                    ) : null}
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u?.email ?? "—"}
                  </p>
                </AlunoProfileLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
