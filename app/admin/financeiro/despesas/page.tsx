import { getSchoolScope, scopedSchoolIds } from "@/lib/school-scope";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { currentReferenceMonthLisbon, LISBON_TZ } from "@/lib/lisbon-payment-dates";
import { getFinanceiroOverview } from "@/lib/admin-finance-overview";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { monthLabelPt } from "@/lib/admin-student-ficha";
import { FinanceiroModals } from "../_components/FinanceiroModals";
import { financeiroModalLabels } from "../_lib/modal-labels";
import { QuickExpensePanel, type ExpenseTemplate } from "../_components/QuickExpensePanel";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ expenseError?: string }>;

function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 15));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Despesas: registo rápido, recentes, repetir as fixas do mês passado e a lista completa. */
export default async function AdminFinanceiroDespesasPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  const params = await searchParams;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const currentMonth = currentReferenceMonthLisbon(new Date());
  const [locale, overview] = await Promise.all([
    getLocaleFromCookies() as Promise<"pt" | "en">,
    getFinanceiroOverview(supabase, currentMonth, scopedSchoolIds(await getSchoolScope())),
  ]);
  const t = getTranslations(locale);
  const todayYmd = formatInTimeZone(new Date(), LISBON_TZ, "yyyy-MM-dd");
  const expenses = overview.allExpenses;

  // Recentes: últimas descrições distintas (para preencher num toque).
  const sorted = [...expenses].sort((a, b) => (b.occurredOn + b.createdAt).localeCompare(a.occurredOn + a.createdAt));
  const seen = new Set<string>();
  const recent: ExpenseTemplate[] = [];
  for (const e of sorted) {
    const k = e.description.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    recent.push({ description: e.description, amount: e.amount, category: e.category, kind: e.kind, paymentMethod: e.paymentMethod ?? "TRANSFER" });
    if (recent.length >= 6) break;
  }

  // Fixas do mês passado que ainda não foram lançadas este mês.
  const lastMonth = prevMonth(currentMonth);
  const thisMonthDescs = new Set(expenses.filter((e) => e.occurredOn.startsWith(currentMonth)).map((e) => e.description.trim().toLowerCase()));
  const fixedToRepeat: ExpenseTemplate[] = expenses
    .filter((e) => e.kind === "FIXED" && e.occurredOn.startsWith(lastMonth) && !thisMonthDescs.has(e.description.trim().toLowerCase()))
    .map((e) => ({ description: e.description, amount: e.amount, category: e.category, kind: e.kind, paymentMethod: e.paymentMethod ?? "TRANSFER" }));

  const monthTotal = overview.expensesCurrentMonth;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <QuickExpensePanel
        defaultDate={todayYmd}
        recent={recent}
        fixedToRepeat={fixedToRepeat}
        lastMonthLabel={monthLabelPt(lastMonth)}
        monthLabel={monthLabelPt(currentMonth)}
        monthTotal={monthTotal}
      />
      <FinanceiroModals
        inlineSections={["expenses"]}
        buttons={[]}
        hideAddExpense
        referenceMonth={currentMonth}
        renewalsPending={[]}
        paymentRows={[]}
        expenses={expenses}
        expensesError={overview.expensesError}
        expenseErrorFromUrl={params.expenseError ?? null}
        defaultExpenseDate={todayYmd}
        revenue={{
          error: null,
          errorHint: "",
          modalTitle: "",
          sectionHint: "",
          sectionHintAria: "",
          tableFront: "",
          tableAmount: "",
          tableActions: "",
          noRows: "",
          totalLabel: "",
          addBlockTitle: "",
          formAmount: "",
          formDescription: "",
          formDate: "",
          formPaymentMethod: "",
          formSubmit: "",
          formSuccess: "",
          rows: [],
          total: 0,
        }}
        revenueErrorFromUrl={null}
        defaultManualRevenueDate={todayYmd}
        physicalCashOnHand={0}
        treasuryError={null}
        recentCashDeposits={[]}
        depositErrorFromUrl={null}
        defaultCashDepositDate={todayYmd}
        labels={financeiroModalLabels(t, locale, null)}
        locale={locale}
      />
    </div>
  );
}
