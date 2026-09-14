import { cookies } from "next/headers";
import { edgeCacheDelete } from "@/lib/edge-ttl-cache";

/** Cookie curto pedido ao middleware para ignorar cache stale do gate (Edge ≠ Node). */
export const STUDENT_GATE_REFRESH_COOKIE = "kfs-student-gate-refresh";

export function studentGateCacheKey(studentId: string): string {
  return `student-gate:${studentId}`;
}

/** Best-effort no Node; o cookie garante invalidação no próximo pedido Edge. */
export async function invalidateStudentGateCache(studentId: string): Promise<void> {
  edgeCacheDelete(studentGateCacheKey(studentId));
  const jar = await cookies();
  jar.set(STUDENT_GATE_REFRESH_COOKIE, studentId, {
    path: "/",
    maxAge: 30,
    httpOnly: true,
    sameSite: "lax",
  });
}
