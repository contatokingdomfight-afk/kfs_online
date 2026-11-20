import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ChevronRight, Search } from "lucide-react";
import { getSchoolScope, scopedSchoolIds } from "@/lib/school-scope";
import { filterSchools } from "@/lib/school-scope-rules";
import { inChunks } from "@/lib/graduation/queries";
import { formatCertificateDate, formatCertificateNumber } from "@/lib/graduation/certificate";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { GradeName } from "@/components/graduation/GradeName";

type Row = {
  id: string;
  eventId: string;
  number: string;
  studentName: string;
  modalityCode: string;
  modalityName: string;
  gradeName: string;
  gradeColors: string[];
  issuedAt: string;
};

const chip = (on: boolean): React.CSSProperties => ({
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 999,
  border: `1px solid ${on ? "var(--text-primary)" : "var(--border)"}`,
  background: on ? "var(--text-primary)" : "var(--bg-secondary)",
  color: on ? "var(--bg)" : "var(--text-secondary)",
  textDecoration: "none",
  whiteSpace: "nowrap",
});

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Todos os certificados de graduação (aprovados já revelados) das escolas do utilizador. */
export async function CertificadosTab({
  supabase,
  modalities,
  modalityParam,
  query,
}: {
  supabase: SupabaseClient;
  modalities: { code: string; name: string }[];
  modalityParam?: string;
  query?: string;
}) {
  const { data: events } = await filterSchools(
    supabase.from("GraduationExamEvent").select("id, modalityCode"),
    scopedSchoolIds(await getSchoolScope())
  );
  const modalityByEvent = new Map((events ?? []).map((e) => [e.id as string, e.modalityCode as string]));

  const candidates = await inChunks(
    [...modalityByEvent.keys()],
    async (chunk) =>
      ((
        await supabase
          .from("GraduationExamCandidate")
          .select("id, eventId, studentId, gradeId, placementAwardedGradeId, revealedAt, certificateNumber")
          .eq("status", "PASSED")
          .not("revealedAt", "is", null)
          .not("certificateNumber", "is", null)
          .in("eventId", chunk)
      ).data ?? []) as {
        id: string;
        eventId: string;
        studentId: string;
        gradeId: string;
        placementAwardedGradeId: string | null;
        revealedAt: string;
        certificateNumber: number;
      }[]
  );

  const studentIds = [...new Set(candidates.map((c) => c.studentId))];
  const gradeIds = [...new Set(candidates.map((c) => c.placementAwardedGradeId ?? c.gradeId))];
  const [students, grades] = await Promise.all([
    inChunks(studentIds, async (chunk) => ((await supabase.from("Student").select("id, userId").in("id", chunk)).data ?? []) as { id: string; userId: string | null }[]),
    inChunks(gradeIds, async (chunk) => ((await supabase.from("GraduationGrade").select("id, name, colors").in("id", chunk)).data ?? []) as { id: string; name: string; colors: string[] | null }[]),
  ]);
  const userIds = [...new Set(students.map((s) => s.userId).filter((v): v is string => !!v))];
  const users = await inChunks(userIds, async (chunk) => ((await supabase.from("User").select("id, name").in("id", chunk)).data ?? []) as { id: string; name: string | null }[]);

  const userName = new Map(users.map((u) => [u.id, (u.name ?? "").trim()]));
  const studentName = new Map(students.map((s) => [s.id, (s.userId && userName.get(s.userId)) || "Aluno"]));
  const gradeById = new Map(grades.map((g) => [g.id, g]));
  const modalityName = new Map(modalities.map((m) => [m.code, m.name]));

  const all: Row[] = candidates
    .map((c) => {
      const modalityCode = modalityByEvent.get(c.eventId) ?? "";
      const grade = gradeById.get(c.placementAwardedGradeId ?? c.gradeId);
      return {
        id: c.id,
        eventId: c.eventId,
        number: formatCertificateNumber(modalityCode, c.revealedAt, c.certificateNumber),
        studentName: studentName.get(c.studentId) ?? "Aluno",
        modalityCode,
        modalityName: modalityName.get(modalityCode) ?? modalityCode,
        gradeName: grade?.name ?? "Grau",
        gradeColors: (grade?.colors ?? []).filter(Boolean),
        issuedAt: c.revealedAt,
      };
    })
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  const presentModalities = [...new Set(all.map((r) => r.modalityCode))];
  const selected = modalityParam && presentModalities.includes(modalityParam) ? modalityParam : null;
  const q = normalize((query ?? "").trim());
  const rows = all.filter((r) => (!selected || r.modalityCode === selected) && (!q || normalize(r.studentName).includes(q) || normalize(r.number).includes(q)));

  const href = (m: string | null) => {
    const p = new URLSearchParams({ tab: "certificados" });
    if (m) p.set("m", m);
    if (query) p.set("q", query);
    return `/coach/graduacao?${p}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <form action="/coach/graduacao" method="get" style={{ display: "flex", gap: 8 }}>
        <input type="hidden" name="tab" value="certificados" />
        {selected && <input type="hidden" name="m" value={selected} />}
        <input
          name="q"
          type="search"
          defaultValue={query ?? ""}
          className="input"
          placeholder="Procurar aluno ou n.º do certificado"
          aria-label="Procurar certificado"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button type="submit" className="btn btn-secondary" aria-label="Procurar" style={{ flexShrink: 0 }}>
          <Search size={16} aria-hidden />
        </button>
      </form>

      {presentModalities.length > 1 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          <Link href={href(null)} style={chip(!selected)}>
            Todas
          </Link>
          {presentModalities.map((m) => (
            <Link key={m} href={href(m)} style={chip(selected === m)}>
              {modalityName.get(m) ?? m}
            </Link>
          ))}
        </div>
      )}

      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
        {rows.length} {rows.length === 1 ? "certificado" : "certificados"}
      </p>

      {rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
          {all.length === 0 ? "Ainda não há certificados. Aparecem quando os resultados de um exame são revelados." : "Nenhum certificado encontrado."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/coach/graduacao/${r.eventId}/certificado/${r.id}`}
                className="card"
                style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", textDecoration: "none", color: "var(--text-primary)" }}
              >
                <BeltSwatch colors={r.gradeColors} width={36} height={12} modality={r.modalityCode} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: "var(--text-base)", overflowWrap: "anywhere" }}>{r.studentName}</strong>
                  <span style={{ display: "block", marginTop: 2, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                    <GradeName name={r.gradeName} /> · {r.modalityName}
                  </span>
                  <span style={{ display: "block", marginTop: 2, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                    N.º {r.number} · {formatCertificateDate(r.issuedAt)}
                  </span>
                </div>
                <ChevronRight size={18} aria-hidden style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
