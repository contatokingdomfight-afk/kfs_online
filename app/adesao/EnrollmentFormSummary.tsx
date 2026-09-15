import { EnrollmentFormDocumentView } from "@/components/documents/EnrollmentFormDocumentView";
import type { EnrollmentFormRow } from "@/lib/enrollment-form";
import type { SchoolSignature } from "@/lib/school-signatures";

type Props = {
  form: EnrollmentFormRow;
  fullName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  planName: string;
  primaryModality?: string | null;
  modalityScope?: string | null;
  modalityLabel: string | null;
  monthlyAmount: number;
  enrollmentAmount: number;
  insuranceAmount?: number;
  showEnrollment: boolean;
  showInsurance: boolean;
  agreementSigned?: boolean;
  signatureName?: string | null;
  signatureImageUrl?: string | null;
  schoolSignatures?: SchoolSignature[];
};

/** Comprovativo de adesão preenchido — layout oficial para consulta e impressão. */
export function EnrollmentFormSummary(props: Props) {
  return (
    <EnrollmentFormDocumentView
      form={props.form}
      fullName={props.fullName}
      email={props.email}
      dateOfBirth={props.dateOfBirth}
      phone={props.phone}
      planName={props.planName}
      primaryModality={props.primaryModality ?? null}
      modalityScope={props.modalityScope ?? null}
      modalityLabel={props.modalityLabel}
      monthlyAmount={props.monthlyAmount}
      enrollmentAmount={props.enrollmentAmount}
      insuranceAmount={props.insuranceAmount}
      showEnrollment={props.showEnrollment}
      showInsurance={props.showInsurance}
      agreementSigned={props.agreementSigned}
      signatureName={props.signatureName}
      signatureImageUrl={props.signatureImageUrl}
      schoolSignatures={props.schoolSignatures}
    />
  );
}
