/** Nome pelo qual os documentos de adesão designam a Sede. */
export const SEDE_DISPLAY_NAME = "Kingdom Fight School";

/** Sem nome conhecido usa-se o termo que os documentos já empregam; nunca o nome da Sede em vez de outra escola. */
const UNKNOWN_SCHOOL_NAME = "Academia";

/** Troca o nome da Sede pelo da escola num texto dos documentos. Na Sede o texto fica igual. */
export function withSchoolName(text: string, schoolName: string | null | undefined): string {
  return text.split(SEDE_DISPLAY_NAME).join(schoolName?.trim() || UNKNOWN_SCHOOL_NAME);
}
