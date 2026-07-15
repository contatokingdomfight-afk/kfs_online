import { Suspense } from "react";
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
import { FinanceiroModals, type PaymentListRow } from "./_components/FinanceiroModals";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { MonthSelector } from "./_components/MonthSelector";
import { FINANCE_PAYMENT_METHODS, FINANCE_PAYMENT_METHOD_LABELS_PT } from "@/lib/finance-payment-method";

type SearchParams = Promise<{
  deduped?: string;
  dedupedError?: string;
  expenseError?: string;
  revenueError?: string;
  depositError?: string;
  month?: string;
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
    case "MERCHANDISE":
      return `${t("adminFinanceRevenueTagMerchandise")}: ${row.label}`;
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
  const depositError = params.depositError;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const currentMonth = currentReferenceMonthLisbon(new Date());
  const referenceMonth =
    params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth;

  const [locale, overview] = await Promise.all([
    getLocaleFromCookies() as Promise<"pt" | "en">,
    getFinanceiroOverview(supabase, referenceMonth),
  ]);
  const revenue = await getRevenueBreakdown(supabase, referenceMonth);
  const t = getTranslations(locale);
  const todayYmd = formatInTimeZone(new Date(), LISBON_TZ, "yyyy-MM-dd");

  const renewalsPending = await getRenewalsPending(supabase, referenceMonth);

  const { data: payments } = await supabase
    .from("Payment")
    .select("id, studentId, amount, status, referenceMonth, referenceYear, paymentType, familyGroupId, createdAt")
    .order("referenceMonth", { ascending: false })
    .order("createdAt", { ascending: false })
    .limit(200);

  const list = payments ?? [];
  const familyGroupIds = [...new Set(list.map((p) => (p as { familyGroupId?: string | null }).familyGroupId).filter(Boolean))] as string[];
  const familyMemberCountByGroup = new Map<string, number>();
  for (const gid of familyGroupIds) {
    const { count } = await supabase
      .from("FamilyGroupMember")
      .select("id", { count: "exact", head: true })
      .eq("familyGroupId", gid);
    familyMemberCountByGroup.set(gid, count ?? 0);
  }
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
    const paymentType = String((p as { paymentType?: string }).paymentType ?? "TUITION");
    const familyGroupId = (p as { familyGroupId?: string | null }).familyGroupId ?? null;
    return {
      id: p.id,
      studentId: p.studentId,
      displayName: u?.name || u?.email || "—",
      status: p.status,
      referenceMonth: (p.referenceMonth as string | null) ?? null,
      referenceYear: ((p as { referenceYear?: string | null }).referenceYear as string | null) ?? null,
      paymentType,
      amount: Number(p.amount),
      familyGroupId,
      familyMemberCount: familyGroupId ? familyMemberCountByGroup.get(familyGroupId) ?? null : null,
    };
  });

  const paymentCsvRows = paymentRows.map((p) => ({
    aluno: p.displayName,
    tipo:
      p.paymentType === "INSURANCE"
        ? "Seguro"
        : p.paymentType === "ENROLLMENT"
          ? "Matrícula"
          : "Mensalidade",
    periodo:
      p.paymentType === "INSURANCE"
        ? (p.referenceYear ?? "")
        : p.paymentType === "ENROLLMENT"
          ? "—"
          : (p.referenceMonth ?? ""),
    valor: p.amount.toFixed(2),
    status: p.status === "PAID" ? "Pago" : "Em atraso",
    data: list.find((x) => x.id === p.id)?.createdAt
      ? String(list.find((x) => x.id === p.id)!.createdAt).slice(0, 10)
      : "",
  }));

  const refMonthForLabel = referenceMonth;
  const periodLabel = new Date(refMonthForLabel + "-15T12:00:00Z").toLocaleDateString(
    locale === "en" ? "en-GB" : "pt-PT",
    { month: "long", year: "numeric" }
  );

  const revenueDisplayRows = revenue.rows.map((r) => ({
    key: r.key,
    displayLabel: formatRevenueRowLabel(t, r),
    amount: r.amount,
    isManual: r.category === "MANUAL",
  }));

  return (
    <div>
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
          <Suspense fallback={null}>
            <MonthSelector currentMonth={referenceMonth} label={t("adminFinanceMonthSelector")} />
          </Suspense>
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
              <span>{t("adminFinanceRevenueMonth")}</span>
              <InlineInfoTip
                detail={`${t("adminFinanceRevenueTuitionPart")}: ${formatMoneyN(overview.revenueTuitionMonth, locale)} · ${t("adminFinanceRevenueOnboardingPart")}: ${formatMoneyN(overview.revenueOnboardingMonth, locale)}`}
                ariaLabel={t("adminFinanceRevenueInfoAria")}
              />
            </div>
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
              <span>{t("adminFinanceCaixa")}</span>
              <InlineInfoTip
                detail={`${t("adminFinanceCaixaHint")}${overview.cashDepositsInMonth > 0 ? ` ${locale === "pt" ? "Depósitos de espécie no mês:" : "Cash deposits this month:"} ${formatMoneyN(overview.cashDepositsInMonth, locale)}` : ""}`}
                ariaLabel={t("adminFinanceCaixaInfoAria")}
              />
            </div>
            <div style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 700, color: "var(--text-primary)" }}>
              {formatMoneyN(overview.caixaBankTotal, locale)}
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
              <span>{t("adminFinancePhysicalCash")}</span>
              <InlineInfoTip
                detail={t("adminFinancePhysicalCashHint")}
                ariaLabel={t("adminFinancePhysicalCashInfoAria")}
              />
            </div>
            <div style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 700, color: "var(--text-primary)" }}>
              {formatMoneyN(overview.physicalCashOnHand, locale)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
              {t("adminFinanceRevenueByMethodTitle")}
            </h3>
            <InlineInfoTip detail={t("adminFinanceRevenueByMethodHint")} ariaLabel={t("adminFinanceRevenueByMethodTitle")} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: 10,
            }}
          >
            {FINANCE_PAYMENT_METHODS.map((method) => (
              <div key={method} className="card" style={{ padding: 12, background: "var(--bg)" }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
                  {FINANCE_PAYMENT_METHOD_LABELS_PT[method]}
                </div>
                <div style={{ fontSize: "clamp(16px, 3.5vw, 20px)", fontWeight: 700, color: "var(--text-primary)" }}>
                  {formatMoneyN(overview.revenueInMonthByMethod[method], locale)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {revenueError && (
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

      <div style={{ marginBottom: 16 }}>
        <ExportCsvButton rows={paymentCsvRows} filename="pagamentos-kfs.csv" />
      </div>

      <FinanceiroModals
        referenceMonth={referenceMonth}
        renewalsPending={renewalsPending}
        paymentRows={paymentRows}
        expenses={overview.allExpenses}
        expensesError={overview.expensesError}
        expenseErrorFromUrl={expenseError ?? null}
        defaultExpenseDate={todayYmd}
        revenue={{
          error: revenue.error,
          errorHint: t("adminFinanceRevenueMigratedHint"),
          modalTitle: `${t("adminFinanceRevenueBySourceTitle")} — ${periodLabel}`,
          sectionHint: t("adminFinanceRevenueSectionHint"),
          sectionHintAria: t("adminFinanceRevenueSectionInfoAria"),
          tableFront: t("adminFinanceRevenueTableFront"),
          tableAmount: t("adminFinanceRevenueTableAmount"),
          tableActions: t("adminFinanceRevenueTableActions"),
          noRows: t("adminFinanceRevenueNoRows"),
          totalLabel: t("adminFinanceRevenueTotal"),
          addBlockTitle: t("adminFinanceRevenueAddBlockTitle"),
          formAmount: t("adminFinanceRevenueFormAmount"),
          formDescription: t("adminFinanceRevenueFormDescription"),
          formDate: t("adminFinanceRevenueFormDate"),
          formPaymentMethod: t("paymentMethodLabel"),
          formSubmit: t("adminFinanceRevenueFormSubmit"),
          formSuccess: t("adminFinanceRevenueSaved"),
          rows: revenueDisplayRows,
          total: revenue.total,
        }}
        revenueErrorFromUrl={revenueError ?? null}
        defaultManualRevenueDate={todayYmd}
        physicalCashOnHand={overview.physicalCashOnHand}
        treasuryError={overview.treasuryError}
        recentCashDeposits={overview.recentCashDeposits}
        depositErrorFromUrl={depositError ?? null}
        defaultCashDepositDate={todayYmd}
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
          colCategory: t("adminFinanceColCategory"),
          colPaymentMethod: t("adminFinanceColPaymentMethod"),
          colAmount: t("adminFinanceColAmount"),
          colActions: t("adminFinanceColActions"),
          noExpenses: t("adminFinanceNoExpenses"),
          noExpensesFilter: t("adminFinanceNoExpensesFilter"),
          expenseFilterSearch: t("adminFinanceExpenseFilterSearch"),
          expenseFilterDateFrom: t("adminFinanceExpenseFilterDateFrom"),
          expenseFilterDateTo: t("adminFinanceExpenseFilterDateTo"),
          expenseFilterAmountMin: t("adminFinanceExpenseFilterAmountMin"),
          expenseFilterAmountMax: t("adminFinanceExpenseFilterAmountMax"),
          expenseFilterClear: t("adminFinanceExpenseFilterClear"),
          formAmount: t("adminFinanceFormAmount"),
          formDescription: t("adminFinanceFormDescription"),
          formDate: t("adminFinanceFormDate"),
          formPaymentMethod: t("paymentMethodLabel"),
          formKindField: t("adminFinanceFormKind"),
          formKindFixed: t("adminFinanceKindFixed"),
          formKindVariable: t("adminFinanceKindVariable"),
          formCategory: t("adminFinanceColCategory"),
          formSubmit: t("adminFinanceFormSubmit"),
          expenseSaved: t("adminFinanceExpenseSaved"),
          editExpenseTitle: t("adminFinanceEditExpenseTitle"),
          editExpenseAction: t("adminFinanceEditExpenseAction"),
          editExpenseSubmit: t("adminFinanceEditExpenseSubmit"),
          deleteLabel: t("adminFinanceDelete"),
          deletingExpenseLabel: t("adminFinanceDeletingExpense"),
          expenseErrorSuffix:
            locale === "pt"
              ? "— aplica as migrações add_financial_expense.sql e add_financial_expense_kind.sql (Supabase) se faltar tabela ou coluna «kind»."
              : "— run add_financial_expense.sql and add_financial_expense_kind.sql (Supabase) if the table or «kind» column is missing.",
          openRenewals: t("adminFinanceOpenRenewals"),
          openPayments: t("adminFinanceOpenPayments"),
          openExpenses: t("adminFinanceOpenExpenses"),
          openRevenue: t("adminFinanceOpenRevenue"),
          openCashDeposits: t("adminFinanceOpenCashDeposits"),
          cashDepositTitle: t("adminFinanceCashDepositTitle"),
          cashDepositRecentTitle: t("adminFinanceCashDepositRecent"),
          cashDepositAmount: t("adminFinanceCashDepositAmount"),
          cashDepositDate: t("adminFinanceCashDepositDate"),
          cashDepositDescription: t("adminFinanceCashDepositDescription"),
          cashDepositSubmit: t("adminFinanceCashDepositSubmit"),
          cashDepositSaved: t("adminFinanceCashDepositSaved"),
          cashDepositPhysicalHint: t("adminFinanceCashDepositHint"),
          deletingDepositLabel: t("adminFinanceDeletingDeposit"),
          registerPaymentCta: t("adminFinancePaymentsRegisterCta"),
          voidLateTuitionCta: t("adminFinanceVoidLateTuitionCta"),
          voidLateTuitionHint: t("adminFinanceVoidLateTuitionHint"),
          onboardingBundleLabel: t("adminFinanceOnboardingBundleLabel"),
          familyTuitionLabel: t("adminFinanceFamilyTuitionLabel"),
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
