-- Coach e ADMIN precisam de ler Student para ver lista de presenças na aula
-- student_select_own já permite ao aluno ver o próprio registo
-- Esta política permite: ADMIN vê todos; Coach vê alunos da sua escola
CREATE POLICY "student_select_coach_admin" ON "Student" FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "User" u
    LEFT JOIN "Coach" c ON c."userId" = u.id
    WHERE u."authUserId" = (auth.uid())::text
    AND (
      u.role = 'ADMIN'
      OR (c.id IS NOT NULL AND (c."schoolId" = "Student"."schoolId" OR c."schoolId" IS NULL))
    )
  )
);
