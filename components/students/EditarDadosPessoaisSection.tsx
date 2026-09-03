import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { EditarDadosPessoaisForm } from "./EditarDadosPessoaisForm";

type Props = { studentId: string };

/** Editar telefone, NIF, documento, morada, contacto de emergência e medidas — só ADMIN. */
export async function EditarDadosPessoaisSection({ studentId }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return null;

  const result = getAdminClientOrNull();
  if (!result.client) return null;
  const supabase = result.client;

  const [{ data: profile }, { data: enrollment }] = await Promise.all([
    supabase.from("StudentProfile").select("phone, nickname, dateOfBirth, weightKg, heightCm").eq("studentId", studentId).maybeSingle(),
    supabase
      .from("StudentEnrollmentForm")
      .select("idDocument, taxId, addressLine, postalCode, emergencyContactName, emergencyContactRelationship, emergencyContactPhone")
      .eq("studentId", studentId)
      .maybeSingle(),
  ]);

  const str = (v: unknown): string => (v == null ? "" : String(v));

  return (
    <details
      className="aluno-edit-details"
      style={{
        marginTop: "clamp(16px, 4vw, 20px)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--bg-secondary)",
        overflow: "hidden",
      }}
    >
      <summary
        style={{
          padding: "clamp(14px, 3.5vw, 18px)",
          fontSize: "clamp(15px, 3.8vw, 17px)",
          fontWeight: 600,
          color: "var(--text-primary)",
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ opacity: 0.8 }} aria-hidden>▼</span>
        Editar dados pessoais (telefone, NIF, morada, etc.)
      </summary>
      <div style={{ padding: "0 clamp(14px, 3.5vw, 18px) clamp(14px, 3.5vw, 18px) clamp(14px, 3.5vw, 18px)", borderTop: "1px solid var(--border)" }}>
        <EditarDadosPessoaisForm
          studentId={studentId}
          initial={{
            phone: str(profile?.phone),
            nickname: str(profile?.nickname),
            dateOfBirth: str(profile?.dateOfBirth).slice(0, 10),
            weightKg: str(profile?.weightKg),
            heightCm: str(profile?.heightCm),
            idDocument: str(enrollment?.idDocument),
            taxId: str(enrollment?.taxId),
            addressLine: str(enrollment?.addressLine),
            postalCode: str(enrollment?.postalCode),
            emergencyContactName: str(enrollment?.emergencyContactName),
            emergencyContactRelationship: str(enrollment?.emergencyContactRelationship),
            emergencyContactPhone: str(enrollment?.emergencyContactPhone),
          }}
        />
      </div>
    </details>
  );
}
