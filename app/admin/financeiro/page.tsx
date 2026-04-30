import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { currentReferenceMonthLisbon, LISBON_TZ } from "@/lib/lisbon-payment-dates";
import { formatInTimeZone } from "date-fns-tz";
import { getRenewalsPending } from "@/lib/renewals";
import { RenewalsSection } from "./RenewalsSection";
import { dedupeDuplicatePaymentsAction, deleteFinancialExpense } from "./actions";
import { getFinanceiroOverview } from "@/lib/admin-finance-overview";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { AddExpenseForm } from "./_components/AddExpenseForm";

const STATUS_LABEL: Record<string, string> = {
  PAID: "Pago",
  LATE: "Em atraso",
};

type SearchParams = Promise<{
  status?: string;
  deduped?: string;
  dedupedError?: string;
  expenseError?: string;
}>;

function formatMoney(n: number, locale: "pt" | "en") {
  return n.toLocaleString(locale === "en" ? "en-GB" : "pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}

function formatTableDate(yyyyMmDd: string, locale: "pt" | "en") {
  const d = new Date(yyyyMmDd + "T12:00:00Z");
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminFinanceiroPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const filterStatus = params.status ?? "all";
  const deduped = params.deduped;
  const dedupedError = params.dedupedError;
  const expenseError = params.expenseError;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [locale, overview] = await Promise.all([
    getLocaleFromCookies() as Promise<"pt" | "en">,
    getFinanceiroOverview(supabase),
  ]);
  const t = getTranslations(locale);
  const todayYmd = formatInTimeZone(new Date(), LISBON_TZ, "yyyy-MM-dd");

  const currentMonth = currentReferenceMonthLisbon(new Date());
  const renewalsPending = await getRenewalsPending(supabase, currentMonth);

  const { data: payments } = await supabase
    .from("Payment")
    .select("id, studentId, amount, status, referenceMonth, createdAt")
    .order("referenceMonth", { ascending: false })
    .order("createdAt", { ascending: false })
    .limit(200);

  const list = payments ?? [];
  let filtered = list;
  if (filterStatus !== "all") filtered = list.filter((p) => p.status === filterStatus);

  const studentIds = [...new Set(filtered.map((p) => p.studentId))];
  const { data: students } = await supabase.from("Student").select("id, userId").in("id", studentIds);
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));

  const refMonthForLabel = overview.referenceMonth;
  const periodLabel = new Date(refMonthForLabel + "-15T12:00:00Z").toLocaleDateString(
    locale === "en" ? "en-GB" : "pt-PT",
    { month: "long", year: "numeric" }
  );

  return (
    <div style={{ maxWidth: "min(900px, 100%)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 16px)",
          marginBottom: "clamp(20px, 5vw, 24px)",
        }}
      >
        <Link
          href="/admin"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Financeiro
        </h1>
        <Link
          href="/admin/financeiro/compras"
          className="btn"
          style={{
            marginLeft: "auto",
            textDecoration: "none",
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-primary)",
          }}
        >
          Compras e inscrições
        </Link>
        <Link
          href="/admin/financeiro/coaches"
          className="btn"
          style={{ textDecoration: "none", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          Pagamentos a coaches
        </Link>
        <Link href="/admin/financeiro/novo" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Registar pagamento
        </Link>
      </div>

      {/* Visão geral + despesas */}
      <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)", marginBottom: 24, minWidth: 0 }}>
        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: "clamp(17px, 4.2vw, 19px)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {t("adminFinanceOverviewTitle")} — {periodLabel}
        </h2>
        <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 }}>
          {t("adminFinancePeriodHint")}
        </p>
        {overview.overviewError && (
          <p role="alert" style={{ color: "var(--error)", marginBottom: 16, fontSize: 14 }}>
            {overview.overviewError}
          </p>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div className="card" style={{ padding: 14, background: "var(--bg)" }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{t("adminFinanceActiveStudents")}</div>
            <div style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 700, color: "var(--text-primary)" }}>
              {overview.activeStudents}
            </div>
          </div>
          <div className="card" style={{ padding: 14, background: "var(--bg)" }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{t("adminFinanceRevenueMonth")}</div>
            <div style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 700, color: "var(--text-primary)" }}>
              {formatMoney(overview.revenueCurrentMonth, locale)}
            </div>
          </div>
          <div className="card" style={{ padding: 14, background: "var(--bg)" }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{t("adminFinanceCostsMonth")}</div>
            <div style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 700, color: "var(--text-primary)" }}>
              {formatMoney(overview.expensesCurrentMonth, locale)}
            </div>
          </div>
          <div className="card" style={{ padding: 14, background: "var(--bg)" }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{t("adminFinanceBalanceMonth")}</div>
            <div
              style={{
                fontSize: "clamp(20px, 4vw, 24px)",
                fontWeight: 700,
                color: overview.balanceCurrentMonth < 0 ? "var(--error, #b91c1c)" : "var(--text-primary)",
              }}
            >
              {formatMoney(overview.balanceCurrentMonth, locale)}
            </div>
          </div>
        </div>
      </section>

      <h2
        style={{
          margin: "0 0 8px 0",
          fontSize: "clamp(18px, 4.2vw, 20px)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {t("adminFinanceExpensesSection")}
      </h2>
      {expenseError && (
        <p role="alert" className="card" style={{ padding: 12, color: "var(--error)", marginBottom: 12, fontSize: 14 }}>
          {decodeURIComponent(expenseError)}
        </p>
      )}
      {overview.expensesError && (
        <p role="alert" className="card" style={{ padding: 12, color: "var(--error)", marginBottom: 12, fontSize: 14 }}>
          {overview.expensesError}
          {locale === "pt"
            ? " — aplica a migração add_financial_expense.sql (Supabase) e recarrega se a tabela ainda não existir."
            : " — run migration add_financial_expense.sql (Supabase) if the table is missing."}
        </p>
      )}

      <AddExpenseForm
        defaultDate={todayYmd}
        labels={{
          amount: t("adminFinanceFormAmount"),
          description: t("adminFinanceFormDescription"),
          date: t("adminFinanceFormDate"),
          submit: t("adminFinanceFormSubmit"),
          success: t("adminFinanceExpenseSaved"),
        }}
      />

      <h3
        style={{
          margin: "0 0 12px 0",
          fontSize: "clamp(16px, 3.6vw, 18px)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {t("adminFinanceTableTitle")}
      </h3>
      {overview.allExpenses.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>{t("adminFinanceNoExpenses")}</p>
      ) : (
        <div style={{ overflowX: "auto", marginBottom: 32, border: "1px solid var(--card-border, rgba(0,0,0,.1))", borderRadius: "var(--radius-sm)" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "clamp(13px, 3.1vw, 15px)",
            }}
          >
            <thead>
              <tr style={{ background: "var(--bg-secondary)", textAlign: "left" }}>
                <th style={{ padding: "10px 12px" }}>{t("adminFinanceColDate")}</th>
                <th style={{ padding: "10px 12px" }}>{t("adminFinanceColDescription")}</th>
                <th style={{ padding: "10px 12px" }}>{t("adminFinanceColAmount")}</th>
                <th style={{ padding: "10px 12px" }}>{t("adminFinanceColActions")}</th>
              </tr>
            </thead>
            <tbody>
              {overview.allExpenses.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid var(--card-border, rgba(0,0,0,.06))" }}>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{formatTableDate(e.occurredOn, locale)}</td>
                  <td style={{ padding: "10px 12px" }}>{e.description}</td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{formatMoney(e.amount, locale)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <form action={deleteFinancialExpense} style={{ margin: 0 }}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="btn" style={{ fontSize: 12, padding: "6px 10px" }}>
                        {t("adminFinanceDelete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginBottom: "clamp(16px, 4vw, 20px)", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link
          href="/admin/financeiro"
          className="btn"
          style={{
            textDecoration: "none",
            backgroundColor: filterStatus === "all" ? "var(--primary)" : "var(--bg-secondary)",
            color: filterStatus === "all" ? "#fff" : "var(--text-primary)",
          }}
        >
          Todos
        </Link>
        <Link
          href="/admin/financeiro?status=PAID"
          className="btn"
          style={{
            textDecoration: "none",
            backgroundColor: filterStatus === "PAID" ? "var(--primary)" : "var(--bg-secondary)",
            color: filterStatus === "PAID" ? "#fff" : "var(--text-primary)",
          }}
        >
          Pago
        </Link>
        <Link
          href="/admin/financeiro?status=LATE"
          className="btn"
          style={{
            textDecoration: "none",
            backgroundColor: filterStatus === "LATE" ? "var(--primary)" : "var(--bg-secondary)",
            color: filterStatus === "LATE" ? "#fff" : "var(--text-primary)",
          }}
        >
          Em atraso
        </Link>
      </div>

      {deduped !== undefined && deduped !== "" && (
        <p
          role="status"
          className="card"
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            marginBottom: 16,
            borderLeft: "4px solid var(--success)",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-primary)",
          }}
        >
          Limpeza concluída: removidos {deduped} registo(s) duplicado(s) (mesmo aluno e mês).
        </p>
      )}
      {dedupedError && (
        <p
          role="alert"
          className="card"
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            marginBottom: 16,
            borderLeft: "4px solid var(--danger)",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-primary)",
          }}
        >
          Erro ao limpar duplicados: {dedupedError}
        </p>
      )}

      <form
        action={dedupeDuplicatePaymentsAction}
        style={{ marginBottom: "clamp(16px, 4vw, 20px)" }}
      >
        <button
          type="submit"
          className="btn"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          Limpar duplicados (mesmo aluno + mês)
        </button>
        <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
          Remove «Em atraso» quando já existe «Pago» nesse mês e junta linhas repetidas. Mantém o registo mais antigo.
        </p>
      </form>

      <RenewalsSection referenceMonth={currentMonth} pending={renewalsPending} />

      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          {list.length === 0 ? "Nenhum registo de pagamento." : "Nenhum registo com este filtro."}
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(10px, 2.5vw, 12px)",
          }}
        >
          {filtered.map((p) => {
            const u = studentToUser.get(p.studentId);
            return (
              <li key={p.id} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {u?.name || u?.email || "—"}
                  </span>
                  <span
                    style={{
                      fontSize: "clamp(12px, 3vw, 14px)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: p.status === "PAID" ? "var(--success)" : "var(--danger)",
                      color: "#fff",
                    }}
                  >
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {p.referenceMonth} · {Number(p.amount).toFixed(2)} €
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
