-- Contrato e termo: até aqui qualquer autenticado lia e alterava todas as linhas (USING true).
-- Passa a: cada aluno só lê a sua linha; ninguém escreve com a sessão.
-- A assinatura e as áreas de admin e coach usam o cliente admin (service role), que ignora RLS.
-- Tem de ir para PRD DEPOIS do código: até lá, signAdesaoDocuments grava com a sessão do aluno.

DROP POLICY IF EXISTS "kfs_student_membership_agreement_select" ON public."StudentMembershipAgreement";
DROP POLICY IF EXISTS "kfs_student_membership_agreement_write" ON public."StudentMembershipAgreement";

CREATE POLICY "kfs_student_membership_agreement_select" ON public."StudentMembershipAgreement"
  FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id());

DROP POLICY IF EXISTS "kfs_student_waiver_select" ON public."StudentWaiver";
DROP POLICY IF EXISTS "kfs_student_waiver_write" ON public."StudentWaiver";

CREATE POLICY "kfs_student_waiver_select" ON public."StudentWaiver"
  FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id());
