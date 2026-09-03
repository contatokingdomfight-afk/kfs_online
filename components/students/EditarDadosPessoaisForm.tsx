"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { updateStudentPersonalData, type UpdateStudentPersonalDataResult } from "@/app/admin/alunos/actions";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModalDynamic";
import { FormLoadingModal } from "@/components/FormLoadingModal";

type Props = {
  studentId: string;
  initial: {
    phone: string;
    nickname: string;
    dateOfBirth: string;
    weightKg: string;
    heightCm: string;
    idDocument: string;
    taxId: string;
    addressLine: string;
    postalCode: string;
    emergencyContactName: string;
    emergencyContactRelationship: string;
    emergencyContactPhone: string;
  };
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "A guardar…" : "Guardar"}
    </button>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>{label}</span>
      <input type={type} name={name} defaultValue={defaultValue} className="input" />
    </label>
  );
}

export function EditarDadosPessoaisForm({ studentId, initial }: Props) {
  const [userDismissed, setUserDismissed] = useState(false);
  const wrappedAction = async (prev: UpdateStudentPersonalDataResult | null, formData: FormData) => {
    setUserDismissed(false);
    return updateStudentPersonalData(prev, formData);
  };
  const [state, formAction] = useFormState(wrappedAction, null as UpdateStudentPersonalDataResult | null);
  const router = useRouter();

  const showSuccess = Boolean(state?.success && !state?.error && !userDismissed);

  useEffect(() => {
    if (state?.success && !state?.error) router.refresh();
  }, [state?.success, state?.error, router]);

  return (
    <>
      <SuccessConfirmModal
        open={showSuccess}
        onClose={() => setUserDismissed(true)}
        title="Guardado"
        message="Dados pessoais atualizados."
        closeLabel="Fechar"
      />

      <form
        action={formAction}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(16px, 4vw, 20px)",
        }}
      >
        <FormLoadingModal message="A guardar…" />
        <input type="hidden" name="studentId" value={studentId} />

        <Field label="Telefone" name="phone" defaultValue={initial.phone} />
        <Field label="Apelido de lutador" name="nickname" defaultValue={initial.nickname} />
        <Field label="Data de nascimento" name="dateOfBirth" defaultValue={initial.dateOfBirth} type="date" />
        <Field label="Documento (CC / Passaporte)" name="idDocument" defaultValue={initial.idDocument} />
        <Field label="NIF" name="taxId" defaultValue={initial.taxId} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Peso (kg)" name="weightKg" defaultValue={initial.weightKg} type="number" />
          <Field label="Altura (cm)" name="heightCm" defaultValue={initial.heightCm} type="number" />
        </div>

        <Field label="Morada" name="addressLine" defaultValue={initial.addressLine} />
        <Field label="Código postal" name="postalCode" defaultValue={initial.postalCode} />

        <Field label="Contacto de emergência — nome" name="emergencyContactName" defaultValue={initial.emergencyContactName} />
        <Field
          label="Contacto de emergência — parentesco"
          name="emergencyContactRelationship"
          defaultValue={initial.emergencyContactRelationship}
        />
        <Field label="Contacto de emergência — telefone" name="emergencyContactPhone" defaultValue={initial.emergencyContactPhone} />

        {state?.error && (
          <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>{state.error}</p>
        )}
        <SubmitButton />
      </form>
    </>
  );
}
