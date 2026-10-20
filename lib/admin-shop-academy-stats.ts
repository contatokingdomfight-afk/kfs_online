import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { ACADEMY_PASS_PRICES } from "@/lib/academy/access";

const MONTHS_PT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

type Num = number | string | null;
const n = (v: Num) => Number(v ?? 0) || 0;
const ym = (iso: string) => iso.slice(0, 7);

/** Variação % face ao mês anterior (null quando não há base de comparação). */
function pctChange(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

function monthKeys(thisMonth: string, count: number): string[] {
  const [y, m] = thisMonth.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1)).toISOString().slice(0, 7));
}

export type MonthlyPoint = { key: string; label: string; value: number };

export type ShopAcademyStats = {
  monthLabel: string;
  loja: {
    revenue: number;
    revenueDeltaPct: number | null;
    sales: number;
    salesDelta: number;
    avgTicket: number;
    monthly: MonthlyPoint[];
    ordersAwaitingPayment: number;
    ordersToOrder: number;
    ordersReady: number;
    topProducts: { name: string; units: number; revenue: number }[];
  };
  academy: {
    coursesRevenue: number;
    coursesRevenueDeltaPct: number | null;
    coursePurchases: number;
    activePasses: number;
    passesMonthly: number;
    passesYearly: number;
    newPasses: number;
    cancelledPasses: number;
    /** Receita mensal recorrente estimada dos passes ativos (o anual conta 1/12). */
    mrr: number;
    schoolBuyers: number;
    shopOnlyBuyers: number;
  };
  cursos: {
    published: number;
    salesThisMonth: number;
    avgCompletionPct: number | null;
    commissionsPending: number;
    perCourse: { id: string; name: string; price: number | null; inPass: boolean; salesMonth: number; revenueMonth: number; completionPct: number | null }[];
  };
  /** Totais para o cartão da página «Hoje». */
  totals: { month: number; prevMonth: number; deltaPct: number | null; loja: number; cursos: number; passes: number };
};

export async function getShopAcademyStats(supabase: SupabaseClient, schoolId: string | null): Promise<ShopAcademyStats> {
  const today = calendarDateLisbon(new Date());
  const thisMonth = ym(today);
  const months = monthKeys(thisMonth, 6);
  const prevMonth = months[months.length - 2];
  const since = `${months[0]}-01T00:00:00Z`;
  const [cy, cm] = thisMonth.split("-").map(Number);

  let salesQ = supabase.from("RetailSale").select("id, soldAt, totalAmount").eq("status", "COMPLETED").gte("soldAt", since);
  if (schoolId) salesQ = salesQ.eq("schoolId", schoolId);
  let ordersQ = supabase.from("RetailOrder").select("status").in("status", ["PENDING_PAYMENT", "PAID", "READY"]);
  if (schoolId) ordersQ = ordersQ.eq("schoolId", schoolId);

  const [salesRes, ordersRes, purchasesRes, passesRes, coursesRes, courseSalesRes, modulesRes] = await Promise.all([
    salesQ,
    ordersQ,
    supabase.from("CoursePurchase").select("courseId, studentId, amount, createdAt").eq("status", "PAID").gte("createdAt", since),
    supabase.from("AcademyPass").select("status, interval, createdAt, updatedAt"),
    supabase.from("Course").select("id, name, price, in_pass, is_active, review_status").eq("is_active", true).eq("review_status", "PUBLISHED"),
    supabase.from("CourseSale").select("creatorAmount").eq("status", "PENDING"),
    supabase.from("CourseModule").select("id, course_id").eq("status", "PUBLISHED"),
  ]);

  // ── Loja ──
  const sales = ((salesRes.data ?? []) as { id: string; soldAt: string; totalAmount: Num }[]).map((s) => ({ ...s, amount: n(s.totalAmount), ym: ym(s.soldAt) }));
  const salesNow = sales.filter((s) => s.ym === thisMonth);
  const salesPrev = sales.filter((s) => s.ym === prevMonth);
  const lojaRevenue = salesNow.reduce((a, s) => a + s.amount, 0);
  const lojaPrev = salesPrev.reduce((a, s) => a + s.amount, 0);

  const orders = (ordersRes.data ?? []) as { status: string }[];
  const countOrders = (st: string) => orders.filter((o) => o.status === st).length;

  let topProducts: { name: string; units: number; revenue: number }[] = [];
  if (salesNow.length > 0) {
    const { data: lines } = await supabase
      .from("RetailSaleLine")
      .select("variantId, quantity, lineTotal")
      .in("saleId", salesNow.map((s) => s.id));
    const lineRows = (lines ?? []) as { variantId: string; quantity: number; lineTotal: Num }[];
    const variantIds = [...new Set(lineRows.map((l) => l.variantId))];
    const { data: variants } = variantIds.length
      ? await supabase.from("ProductVariant").select("id, productId").in("id", variantIds)
      : { data: [] };
    const productOfVariant = new Map(((variants ?? []) as { id: string; productId: string }[]).map((v) => [v.id, v.productId]));
    const productIds = [...new Set(productOfVariant.values())];
    const { data: products } = productIds.length ? await supabase.from("Product").select("id, name").in("id", productIds) : { data: [] };
    const nameOfProduct = new Map(((products ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
    const agg = new Map<string, { name: string; units: number; revenue: number }>();
    for (const l of lineRows) {
      const pid = productOfVariant.get(l.variantId);
      if (!pid) continue;
      const cur = agg.get(pid) ?? { name: nameOfProduct.get(pid) ?? "Produto", units: 0, revenue: 0 };
      cur.units += l.quantity;
      cur.revenue += n(l.lineTotal);
      agg.set(pid, cur);
    }
    topProducts = [...agg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }

  // ── Academy ──
  const purchases = ((purchasesRes.data ?? []) as { courseId: string; studentId: string | null; amount: Num; createdAt: string }[]).map((p) => ({ ...p, amt: n(p.amount), ym: ym(p.createdAt) }));
  const purchasesNow = purchases.filter((p) => p.ym === thisMonth);
  const coursesRevenue = purchasesNow.reduce((a, p) => a + p.amt, 0);
  const coursesPrev = purchases.filter((p) => p.ym === prevMonth).reduce((a, p) => a + p.amt, 0);

  const passes = (passesRes.data ?? []) as { status: string; interval: string; createdAt: string; updatedAt: string }[];
  const activePasses = passes.filter((p) => p.status === "active" || p.status === "trialing");
  const passesMonthly = activePasses.filter((p) => p.interval === "month").length;
  const passesYearly = activePasses.filter((p) => p.interval === "year").length;
  const mrr = passesMonthly * ACADEMY_PASS_PRICES.month + (passesYearly * ACADEMY_PASS_PRICES.year) / 12;

  // ── Cursos ──
  const courses = (coursesRes.data ?? []) as { id: string; name: string; price: Num; in_pass: boolean }[];
  const modules = (modulesRes.data ?? []) as { id: string; course_id: string }[];
  const moduleIds = modules.map((m) => m.id);
  const { data: unitRows } = moduleIds.length
    ? await supabase.from("CourseUnit").select("id, module_id").in("module_id", moduleIds).eq("status", "PUBLISHED")
    : { data: [] };
  const courseOfModule = new Map(modules.map((m) => [m.id, m.course_id]));
  const unitsByCourse = new Map<string, string[]>();
  for (const u of (unitRows ?? []) as { id: string; module_id: string }[]) {
    const c = courseOfModule.get(u.module_id);
    if (c) unitsByCourse.set(c, [...(unitsByCourse.get(c) ?? []), u.id]);
  }
  const allUnitIds = [...unitsByCourse.values()].flat();
  const { data: progRows } = allUnitIds.length
    ? await supabase.from("CourseUnitProgress").select("student_id, unit_id").in("unit_id", allUnitIds)
    : { data: [] };
  const progress = (progRows ?? []) as { student_id: string; unit_id: string }[];

  const perCourse = courses.map((c) => {
    const units = new Set(unitsByCourse.get(c.id) ?? []);
    const rows = progress.filter((p) => units.has(p.unit_id));
    const learners = new Set(rows.map((r) => r.student_id)).size;
    const completionPct = units.size > 0 && learners > 0 ? Math.round((rows.length / (units.size * learners)) * 100) : null;
    const mine = purchasesNow.filter((p) => p.courseId === c.id);
    return {
      id: c.id,
      name: c.name,
      price: c.price != null ? n(c.price) : null,
      inPass: c.in_pass,
      salesMonth: mine.length,
      revenueMonth: mine.reduce((a, p) => a + p.amt, 0),
      completionPct,
    };
  }).sort((a, b) => b.revenueMonth - a.revenueMonth || b.salesMonth - a.salesMonth);
  const withCompletion = perCourse.filter((c) => c.completionPct != null);

  const total = lojaRevenue + coursesRevenue + mrr;
  const totalPrev = lojaPrev + coursesPrev + mrr;

  return {
    monthLabel: `${MONTHS_PT[cm - 1]} ${cy}`,
    loja: {
      revenue: lojaRevenue,
      revenueDeltaPct: pctChange(lojaRevenue, lojaPrev),
      sales: salesNow.length,
      salesDelta: salesNow.length - salesPrev.length,
      avgTicket: salesNow.length ? lojaRevenue / salesNow.length : 0,
      monthly: months.map((key) => ({ key, label: MONTHS_PT[Number(key.slice(5)) - 1], value: sales.filter((s) => s.ym === key).reduce((a, s) => a + s.amount, 0) })),
      ordersAwaitingPayment: countOrders("PENDING_PAYMENT"),
      ordersToOrder: countOrders("PAID"),
      ordersReady: countOrders("READY"),
      topProducts,
    },
    academy: {
      coursesRevenue,
      coursesRevenueDeltaPct: pctChange(coursesRevenue, coursesPrev),
      coursePurchases: purchasesNow.length,
      activePasses: activePasses.length,
      passesMonthly,
      passesYearly,
      newPasses: passes.filter((p) => ym(p.createdAt) === thisMonth && (p.status === "active" || p.status === "trialing")).length,
      cancelledPasses: passes.filter((p) => p.status === "canceled" && ym(p.updatedAt) === thisMonth).length,
      mrr,
      schoolBuyers: purchasesNow.filter((p) => p.studentId).length,
      shopOnlyBuyers: purchasesNow.filter((p) => !p.studentId).length,
    },
    cursos: {
      published: courses.length,
      salesThisMonth: purchasesNow.length,
      avgCompletionPct: withCompletion.length ? Math.round(withCompletion.reduce((a, c) => a + (c.completionPct ?? 0), 0) / withCompletion.length) : null,
      commissionsPending: ((courseSalesRes.data ?? []) as { creatorAmount: Num }[]).reduce((a, r) => a + n(r.creatorAmount), 0),
      perCourse,
    },
    totals: { month: total, prevMonth: totalPrev, deltaPct: pctChange(total, totalPrev), loja: lojaRevenue, cursos: coursesRevenue, passes: mrr },
  };
}
