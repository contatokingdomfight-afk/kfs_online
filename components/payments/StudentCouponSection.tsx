import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { couponEligiblePayments, listAppliedPaymentCoupons } from "@/lib/coupons/service";
import { CouponBox } from "./CouponBox";

/** Financeiro do aluno: «Tens um código de desconto?» quando há algo por pagar (ou um cupão aplicado). */
export async function StudentCouponSection({ studentId }: { studentId: string }) {
  const admin = getAdminClientOrNull().client;
  if (!admin) return null;
  const [eligible, applied] = await Promise.all([couponEligiblePayments(admin, studentId), listAppliedPaymentCoupons(admin, studentId)]);
  if (!eligible.length && !applied.length) return null;
  return <CouponBox applied={applied.map((a) => ({ couponId: a.couponId, code: a.code, discount: a.discount }))} />;
}
