import { getSchoolScope, scopedSchoolIds, filterSchools } from "@/lib/school-scope";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { loadStudentGraduations } from "@/lib/graduation/load-student-progress";
import { StudentGraduationView } from "@/components/graduation/StudentGraduationView";
import { ManualReadinessForm } from "./ManualReadinessForm";

export const dynamic = "force-dynamic";

/** Pré-visualização do ecrã "A minha graduação" de um aluno (funciona com o template em rascunho). */
export default async function AdminGraduacaoAlunoPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ modality: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const modalityCode = decodeURIComponent((await params).modality);
  const { student: studentId } = await searchParams;

  const [{ data: modality }, { data: template }, { data: students }] = await Promise.all([
    supabase.from("ModalityRef").select("code, name").eq("code", modalityCode).maybeSingle(),
    supabase.from("GraduationTemplate").select("isPublished").eq("modalityCode", modalityCode).maybeSingle(),
    filterSchools(supabase.from("Student").select("id, userId, primaryModality"), scopedSchoolIds(await getSchoolScope())).eq("status", "ATIVO"),
  ]);
  if (!modality) notFound();

  const userIds = (students ?? []).map((s) => s.userId);
  const names = new Map<string, string>();
  for (let i = 0; i < userIds.length; i += 200) {
    const { data: users } = await supabase.from("User").select("id, name").in("id", userIds.slice(i, i + 200));
    for (const u of users ?? []) names.set(u.id, u.name ?? "");
  }
  const options = (students ?? [])
    .map((s) => ({ id: s.id, name: names.get(s.userId) || "Sem nome", sameModality: s.primaryModality === modalityCode }))
    .sort((a, b) => Number(b.sameModality) - Number(a.sameModality) || a.name.localeCompare(b.name, "pt"));

  const selected = studentId ? options.find((o) => o.id === studentId) ?? null : null;
  const [graduation] = selected ? await loadStudentGraduations(supabase, selected.id, { previewModalityCode: modalityCode }) : [];

  // Decisão manual (guardada, mesmo que já expirada) e quem a fez.
  const { data: manual } = selected
    ? await supabase
        .from("StudentGraduationReadiness")
        .select("status, reason, validUntil, setByUserId, updatedAt")
        .eq("studentId", selected.id)
        .eq("modalityCode", modalityCode)
        .maybeSingle()
    : { data: null };
  const { data: setBy } = manual?.setByUserId
    ? await supabase.from("User").select("name").eq("id", manual.setByUserId).maybeSingle()
    : { data: null };
  const lastChange = manual
    ? `Última alteração: ${setBy?.name ?? "—"} · ${new Date(manual.updatedAt).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" })}`
    : null;

  return (
    <div style={{ maxWidth: "min(720px, 100%)" }}>
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Link
          href={`/admin/graduacao/${encodeURIComponent(modalityCode)}`}
          style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}
        >
          ← Graduação {modality.name}
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px", fontSize: "var(--text-xl)", fontWeight: 600 }}>Ver como aluno</h1>
      <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Mostra o ecrã &quot;A minha graduação&quot; de um aluno em {modality.name}, com os dados reais dele.
        {template && !template.isPublished && " O template está em rascunho: os alunos ainda não veem este ecrã."}
      </p>

      <form method="get" style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <select name="student" defaultValue={selected?.id ?? ""} className="input" style={{ flex: "1 1 240px" }} aria-label="Aluno">
          <option value="" disabled>
            Escolhe um aluno…
          </option>
          <optgroup label={`Modalidade principal: ${modality.name}`}>
            {options
              .filter((o) => o.sameModality)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </optgroup>
          <optgroup label="Outros alunos ativos">
            {options
              .filter((o) => !o.sameModality)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </optgroup>
        </select>
        <button type="submit" className="btn btn-primary">
          Ver
        </button>
      </form>

      {selected && graduation?.progress.next && (
        <ManualReadinessForm
          key={selected.id}
          studentId={selected.id}
          modalityCode={modalityCode}
          initial={manual ? { status: manual.status, reason: manual.reason, validUntil: manual.validUntil ?? null } : null}
          autoReady={graduation.progress.checks.filter((c) => c.key !== "coach").every((c) => c.status === "done")}
          lastChange={lastChange}
        />
      )}

      {selected && (
        <div style={{ marginTop: "var(--space-5)" }}>
          {graduation ? (
            <StudentGraduationView graduation={graduation} />
          ) : (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Esta modalidade ainda não tem graus configurados.</p>
          )}
        </div>
      )}
    </div>
  );
}
