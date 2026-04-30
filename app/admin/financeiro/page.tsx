import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { currentReferenceMonthLisbon, LISBON_TZ } from "@/lib/lisbon-payment-dates";
import { formatInTimeZone } from "date-fns-tz";
import { getRenewalsPending } from "@/lib/renewals";
import { getFinanceiroOverview } from "@/lib/admin-finance-overview";
import { getRevenueBreakdown, type RevenueBreakdownRow } from "@/lib/admin-revenue-breakdown";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
import { AddManualRevenueForm } from "./_components/AddManualRevenueForm";
import { FinanceiroModals, type PaymentListRow } from "./_components/FinanceiroModals";
import { deleteManualRevenue } from "./actions";

type SearchParams = Promise<{
  deduped?: string;
  dedupedError?: string;
  expenseError?: string;
  revenueError?: string;
}>;

function formatRevenueRowLabel(t: (key: import("@/lib/i18n").MessageKey) => string, row: RevenueBreakdownRow): string {
  switch (row.category) {
    case "PLAN":
      return `${t("adminFinanceRevenueTagPlan")}: ${row.label}`;
    case "PLAN_NONE":
      return t("adminFinanceRevenueTagPlanNone");
    case "COURSE":
      return `${t("adminFinanceRevenueTagCourse")}: ${row.label}`;
    case "EVENT":
      return `${t("adminFinanceRevenueTagEvent")}: ${row.label}`;
    case "MANUAL":
      return `${t("adminFinanceRevenueTagManual")}: ${row.label}`;
    default:
      return row.label;
  }
}

function formatMoneyN(n: number, locale: "pt" | "en") {
  return n.toLocaleString(locale === "en" ? "en-GB" : "pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}

export default async function AdminFinanceiroPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const deduped = params.deduped;
  const dedupedError = params.dedupedError;
  const expenseError = params.expenseError;
  const revenueError = params.revenueError;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [locale, overview] = await Promise.all([
    getLocaleFromCookies() as Promise<"pt" | "en">,
    getFinanceiroOverview(supabase),
  ]);
  const revenue = await getRevenueBreakdown(supabase, overview.referenceMonth);
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
  const allPaymentStudentIds = [...new Set(list.map((p) => p.studentId))];
  const { data: students } =
    allPaymentStudentIds.length > 0
      ? await supabase.from("Student").select("id, userId").in("id", allPaymentStudentIds)
      : { data: [] as { id: string; userId: string }[] };
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } =
    userIds.length > 0
      ? await supabase.from("User").select("id, name, email").in("id", userIds)
      : { data: [] as { id: string; name: string | null; email: string }[] };
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));

  const paymentRows: PaymentListRow[] = list.map((p) => {
    const u = studentToUser.get(p.studentId);
    return {
      id: p.id,
      displayName: u?.name || u?.email || "—",
      status: p.status,
      referenceMonth: p.referenceMonth,
      amount: Number(p.amount),
    };
  });

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

      <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)", marginBottom: 20, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: "8px 10px",
            margin: "0 0 20px 0",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(17px, 4.2vw, 19px)",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {t("adminFinanceOverviewTitle")} — {periodLabel}
          </h2>
          <InlineInfoTip
            detail={t("adminFinancePeriodHint")}
            ariaLabel={t("adminFinancePeriodInfoAria")}
          />
        </div>
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
              {formatMoneyN(overview.revenueCurrentMonth, locale)}
            </div>
          </div>
          <div className="card" style={{ padding: 14, background: "var(--bg)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: 4,
              }}
            >
              <span>{t("adminFinanceCostsMonth")}</span>
              {overview.expensesError ? null : (
                <InlineInfoTip
                  detail={`${t("adminFinanceLabelFixed")}: ${formatMoneyN(overview.expensesFixedMonth, locale)} · ${t("adminFinanceLabelVariable")}: ${formatMoneyN(overview.expensesVariableMonth, locale)}`}
                  ariaLabel={t("adminFinanceDespesasDetailAria")}
                />
              )}
            </div>
            <div style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 700, color: "var(--text-primary)" }}>
              {formatMoneyN(overview.expensesCurrentMonth, locale)}
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
              {formatMoneyN(overview.balanceCurrentMonth, locale)}
            </div>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)", marginBottom: 20, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: "8px 10px",
            margin: "0 0 16px 0",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(17px, 4.2vw, 19px)",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {t("adminFinanceRevenueBySourceTitle")} — {periodLabel}
          </h2>
          <InlineInfoTip
            detail={t("adminFinanceRevenueSectionHint")}
            ariaLabel={t("adminFinanceRevenueSectionInfoAria")}
          />
        </div>

        {revenue.error && (
          <p role="alert" style={{ color: "var(--error)", marginBottom: 12, fontSize: 14 }}>
            {revenue.error}
            {` ${t("adminFinanceRevenueMigratedHint")}`}
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 20,
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0, overflow: "auto" }}>
              {!revenue.error && revenue.rows.length === 0 ? (
                <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)" }}>{t("adminFinanceRevenueNoRows")}</p>
              ) : !revenue.error ? (
                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid var(--card-border, rgba(0,0,0,.1))",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "var(--bg-secondary)", textAlign: "left" }}>
                        <th style={{ padding: "8px 10px" }}>{t("adminFinanceRevenueTableFront")}</th>
                        <th style={{ padding: "8px 10px" }}>{t("adminFinanceRevenueTableAmount")}</th>
                        <th style={{ padding: "8px 10px" }}>{t("adminFinanceRevenueTableActions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.rows.map((row) => (
                        <tr key={row.key} style={{ borderTop: "1px solid var(--card-border, rgba(0,0,0,.06))" }}>
                          <td style={{ padding: "8px 10px" }}>{formatRevenueRowLabel(t, row)}</td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{formatMoneyN(row.amount, locale)}</td>
                          <td style={{ padding: "8px 10px" }}>
                            {row.category === "MANUAL" ? (
                              <form action={deleteManualRevenue} style={{ margin: 0 }}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={row.key.replace(/^manual:/, "")}
                                />
                                <button type="submit" className="btn" style={{ fontSize: 12, padding: "4px 8px" }}>
                                  {t("adminFinanceDelete")}
                                </button>
                              </form>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {revenue.rows.length > 0 && (
                      <tfoot>
                        <tr style={{ background: "var(--bg-secondary)", fontWeight: 600 }}>
                          <td style={{ padding: "8px 10px" }}>{t("adminFinanceRevenueTotal")}</td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{formatMoneyN(revenue.total, locale)}</td>
                          <td style={{ padding: "8px 10px" }} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              ) : null}
            </div>

            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  margin: "0 0 12px 0",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {t("adminFinanceRevenueAddBlockTitle")}
              </h3>
              <AddManualRevenueForm
                defaultDate={todayYmd}
                labels={{
                  amount: t("adminFinanceRevenueFormAmount"),
                  description: t("adminFinanceRevenueFormDescription"),
                  date: t("adminFinanceRevenueFormDate"),
                  submit: t("adminFinanceRevenueFormSubmit"),
                  success: t("adminFinanceRevenueSaved"),
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {revenueError && !revenue.error && (
        <p role="alert" className="card" style={{ padding: 12, color: "var(--error)", marginBottom: 12, fontSize: 14 }}>
          {decodeURIComponent(revenueError.replace(/\+/g, " "))}
        </p>
      )}

      {expenseError && !overview.expensesError && (
        <p role="alert" className="card" style={{ padding: 12, color: "var(--error)", marginBottom: 12, fontSize: 14 }}>
          {decodeURIComponent(expenseError.replace(/\+/g, " "))}
        </p>
      )}
      {overview.expensesError && (
        <p role="alert" className="card" style={{ padding: 12, color: "var(--error)", marginBottom: 12, fontSize: 14 }}>
          {overview.expensesError}
          {locale === "pt"
            ? " — aplica as migrações add_financial_expense.sql e add_financial_expense_kind.sql (Supabase) e recarrega se faltar tabela ou coluna «kind»."
            : " — run migrations add_financial_expense.sql and add_financial_expense_kind.sql (Supabase) if the table or «kind» column is missing."}
        </p>
      )}

      <FinanceiroModals
        referenceMonth={currentMonth}
        renewalsPending={renewalsPending}
        paymentRows={paymentRows}
        expenses={overview.allExpenses}
        expensesError={overview.expensesError}
        expenseErrorFromUrl={expenseError ?? null}
        defaultExpenseDate={todayYmd}
        labels={{
          modalsHint: t("adminFinanceModalsHint"),
          close: t("adminActionItemsCloseModal"),
          paymentsModalTitle: t("adminFinancePaymentsModalTitle"),
          filterAll: t("adminFinanceFilterAll"),
          filterPaid: t("adminFinanceFilterPaid"),
          filterLate: t("adminFinanceFilterLate"),
          statusPaid: t("adminFinanceStatusPaid"),
          statusLate: t("adminFinanceStatusLate"),
          noPayments: t("adminFinanceNoPaymentRecords"),
          noPaymentsFilter: t("adminFinanceNoPaymentWithFilter"),
          dedupeButton: t("adminFinanceDedupeButton"),
          dedupeHelp: t("adminFinanceDedupeHelp"),
          expensesTitle: t("adminFinanceExpensesSection"),
          expensesTableTitle: t("adminFinanceTableTitle"),
          colDate: t("adminFinanceColDate"),
          colDescription: t("adminFinanceColDescription"),
          colKind: t("adminFinanceColKind"),
          colAmount: t("adminFinanceColAmount"),
          colActions: t("adminFinanceColActions"),
          noExpenses: t("adminFinanceNoExpenses"),
          formAmount: t("adminFinanceFormAmount"),
          formDescription: t("adminFinanceFormDescription"),
          formDate: t("adminFinanceFormDate"),
          formKindField: t("adminFinanceFormKind"),
          formKindFixed: t("adminFinanceKindFixed"),
          formKindVariable: t("adminFinanceKindVariable"),
          formSubmit: t("adminFinanceFormSubmit"),
          expenseSaved: t("adminFinanceExpenseSaved"),
          deleteLabel: t("adminFinanceDelete"),
          expenseErrorSuffix:
            locale === "pt"
              ? "— aplica as migrações add_financial_expense.sql e add_financial_expense_kind.sql (Supabase) se faltar tabela ou coluna «kind»."
              : "— run add_financial_expense.sql and add_financial_expense_kind.sql (Supabase) if the table or «kind» column is missing.",
          openRenewals: t("adminFinanceOpenRenewals"),
          openPayments: t("adminFinanceOpenPayments"),
          openExpenses: t("adminFinanceOpenExpenses"),
        }}
        locale={locale}
      />

      {deduped !== undefined && deduped !== "" && (
        <p
          role="status"
          className="card"
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            marginTop: 12,
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
            marginTop: 12,
            marginBottom: 16,
            borderLeft: "4px solid var(--danger)",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-primary)",
          }}
        >
          Erro ao limpar duplicados: {dedupedError}
        </p>
      )}
    </div>
  );
}
