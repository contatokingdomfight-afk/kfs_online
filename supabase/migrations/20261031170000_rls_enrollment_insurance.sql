-- Comprovativo e seguro: até aqui qualquer autenticado lia e alterava todas as linhas (USING true).
-- Staff não tem política: as áreas de admin e coach, os crons e os webhooks usam o cliente admin (service role), que ignora RLS.

-- Comprovativo: cada aluno só lê, cria e altera a sua linha (/adesao usa a sessão); ninguém apaga com a sessão.
DROP POLICY IF EXISTS "kfs_student_enrollment_form_select" ON public."StudentEnrollmentForm";
DROP POLICY IF EXISTS "kfs_student_enrollment_form_write" ON public."StudentEnrollmentForm";

CREATE POLICY "kfs_student_enrollment_form_select" ON public."StudentEnrollmentForm"
  FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id());
CREATE POLICY "kfs_student_enrollment_form_insert" ON public."StudentEnrollmentForm"
  FOR INSERT TO authenticated
  WITH CHECK ("studentId" = public.kfs_current_student_id());
CREATE POLICY "kfs_student_enrollment_form_update" ON public."StudentEnrollmentForm"
  FOR UPDATE TO authenticated
  USING ("studentId" = public.kfs_current_student_id())
  WITH CHECK ("studentId" = public.kfs_current_student_id());

-- Cobertura do seguro: nada a usa com a sessão e tem notas internas, por isso fica sem nenhuma política.
DROP POLICY IF EXISTS "kfs_student_insurance_select" ON public."StudentInsuranceCoverage";
DROP POLICY IF EXISTS "kfs_student_insurance_write" ON public."StudentInsuranceCoverage";

-- Valores e versões: o middleware e /adesao leem com a sessão, por isso a leitura mantém-se; só se fecha a escrita.
DROP POLICY IF EXISTS "kfs_insurance_settings_write" ON public."InsuranceSettings";
