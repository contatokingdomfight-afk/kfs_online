import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";

type Props = { studentId: string };

function Row({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  const v = value?.trim();
  if (!v) return null;
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <dt style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5, wordBreak: "break-word" }}>
        {href ? (
          <a href={href} style={{ color: "var(--primary)", textDecoration: "none" }}>
            {v}
          </a>
        ) : (
          v
        )}
      </dd>
    </div>
  );
}

function formatDobPt(ymd: string | null | undefined): string | null {
  if (!ymd) return null;
  const s = String(ymd).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const formatted = d.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
  return age >= 0 && age < 120 ? `${formatted} (${age} anos)` : formatted;
}

function formatMeasures(weightKg: number | null, heightCm: number | null): string | null {
  const parts: string[] = [];
  if (weightKg != null && Number.isFinite(weightKg)) parts.push(`${weightKg} kg`);
  if (heightCm != null && Number.isFinite(heightCm)) parts.push(`${heightCm} cm`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function emergencyFromEnrollment(row: {
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
} | null): { label: string; phone: string | null } | null {
  if (!row?.emergencyContactName?.trim()) return null;
  const name = row.emergencyContactName.trim();
  const rel = row.emergencyContactRelationship?.trim();
  const phone = row.emergencyContactPhone?.trim() || null;
  const label = rel ? `${name} (${rel})` : name;
  return { label, phone };
}

/** Contacto, morada, emergência e notas de saúde — perfil + comprovativo de adesão. */
export async function StudentContactDataSection({ studentId }: Props) {
  const result = getAdminClientOrNull();
  if (!result.client) return null;
  const supabase = result.client;

  const { data: student } = await supabase.from("Student").select("userId").eq("id", studentId).maybeSingle();
  if (!student) return null;

  /** NIF e documento de identificação são dados fiscais sensíveis — só ADMIN vê (coach não, mesmo na própria ficha de aluno). */
  const dbUser = await getCurrentDbUser();
  const isAdmin = dbUser?.role === "ADMIN";

  const [{ data: user }, { data: profile }, { data: enrollment }] = await Promise.all([
    supabase.from("User").select("email").eq("id", student.userId).single(),
    supabase
      .from("StudentProfile")
      .select("phone, nickname, dateOfBirth, weightKg, heightCm, medicalNotes, emergencyContact")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase
      .from("StudentEnrollmentForm")
      .select(
        "formCompleted, addressLine, postalCode, emergencyContactName, emergencyContactRelationship, emergencyContactPhone, allergies, knownHealthCondition, emergencyMedication, taxId, idDocument"
      )
      .eq("studentId", studentId)
      .maybeSingle(),
  ]);

  const phone = (profile?.phone as string | null) ?? null;
  const nickname = (profile?.nickname as string | null)?.trim() || null;
  const email = user?.email ?? null;
  const dob = formatDobPt((profile?.dateOfBirth as string | null) ?? null);
  const taxId = isAdmin ? (enrollment?.taxId as string | null)?.trim() || null : null;
  const idDocument = isAdmin ? (enrollment?.idDocument as string | null)?.trim() || null : null;
  const measures = formatMeasures(
    profile?.weightKg != null ? Number(profile.weightKg) : null,
    profile?.heightCm != null ? Number(profile.heightCm) : null
  );
  const addressParts = [
    (enrollment?.addressLine as string | null)?.trim(),
    (enrollment?.postalCode as string | null)?.trim(),
  ].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(", ") : null;

  const emergEnrollment = emergencyFromEnrollment(
    enrollment as {
      emergencyContactName?: string | null;
      emergencyContactRelationship?: string | null;
      emergencyContactPhone?: string | null;
    } | null
  );
  const emergProfile = (profile?.emergencyContact as string | null)?.trim() || null;

  const allergies = (enrollment?.allergies as string | null)?.trim() || null;
  const healthCondition = (enrollment?.knownHealthCondition as string | null)?.trim() || null;
  const emergencyMed = (enrollment?.emergencyMedication as string | null)?.trim() || null;
  const medicalNotes = (profile?.medicalNotes as string | null)?.trim() || null;

  const hasHealthDetail = Boolean(allergies || healthCondition || emergencyMed || medicalNotes);
  const hasContact = Boolean(
    phone || nickname || email || dob || measures || address || emergEnrollment || emergProfile || taxId || idDocument
  );

  if (!hasContact && !hasHealthDetail) {
    return (
      <section
        className="card"
        style={{
          marginTop: "clamp(16px, 4vw, 20px)",
          padding: "clamp(16px, 4vw, 20px)",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: "clamp(17px, 4vw, 19px)", fontWeight: 600 }}>Dados do aluno</h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55 }}>
          Ainda não há telefone, contacto de emergência ou informação de saúde registados. Estes dados aparecem quando o
          aluno completa o perfil ou o comprovativo de adesão.
        </p>
      </section>
    );
  }

  return (
    <section
      className="card"
      style={{
        marginTop: "clamp(16px, 4vw, 20px)",
        padding: "clamp(16px, 4vw, 20px)",
      }}
    >
      <h2 style={{ margin: "0 0 14px", fontSize: "clamp(17px, 4vw, 19px)", fontWeight: 600 }}>Dados do aluno</h2>

      {hasContact ? (
        <dl style={{ margin: "0 0 16px", display: "grid", gap: 12 }}>
          <Row label="Telefone" value={phone} href={phone ? `tel:${phone.replace(/\s/g, "")}` : undefined} />
          <Row label="Apelido de lutador" value={nickname} />
          <Row label="E-mail" value={email} href={email ? `mailto:${email}` : undefined} />
          <Row label="Data de nascimento" value={dob} />
          <Row label="Documento (CC / Passaporte)" value={idDocument} />
          <Row label="NIF" value={taxId} />
          <Row label="Medidas" value={measures} />
          <Row label="Morada" value={address} />
          {emergEnrollment ? (
            <>
              <Row label="Contacto de emergência" value={emergEnrollment.label} />
              <Row
                label="Telefone de emergência"
                value={emergEnrollment.phone}
                href={emergEnrollment.phone ? `tel:${emergEnrollment.phone.replace(/\s/g, "")}` : undefined}
              />
            </>
          ) : (
            <Row label="Contacto de emergência" value={emergProfile} />
          )}
        </dl>
      ) : null}

      {hasHealthDetail ? (
        <div
          style={{
            paddingTop: hasContact ? 14 : 0,
            borderTop: hasContact ? "1px solid var(--border)" : undefined,
          }}
        >
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            Saúde e alertas
          </p>
          <dl style={{ margin: 0, display: "grid", gap: 12 }}>
            <Row label="Alergias" value={allergies} />
            <Row label="Condição relevante" value={healthCondition} />
            <Row label="Medicação de emergência" value={emergencyMed} />
            {medicalNotes &&
            medicalNotes !== healthCondition &&
            !medicalNotes.includes(allergies ?? "") ? (
              <Row label="Notas médicas (perfil)" value={medicalNotes} />
            ) : null}
          </dl>
        </div>
      ) : null}

      {enrollment?.formCompleted === false ? (
        <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
          Comprovativo de adesão ainda por concluir — alguns dados podem estar em falta.
        </p>
      ) : null}
    </section>
  );
}
