-- Coach e ADMIN precisam de ler User (nome, email) dos alunos na lista de presenças
-- user_select_own já permite ao utilizador ver o próprio registo
CREATE POLICY "user_select_coach_admin" ON "User" FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "User" u
    LEFT JOIN "Coach" c ON c."userId" = u.id
    WHERE u."authUserId" = (auth.uid())::text
    AND (u.role = 'ADMIN' OR c.id IS NOT NULL)
  )
);
