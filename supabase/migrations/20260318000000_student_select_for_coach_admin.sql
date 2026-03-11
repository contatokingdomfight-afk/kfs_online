-- REVERTIDO: student_select_coach_admin causava 500 (recursão RLS).
-- Coach vê alunos via admin client em app/coach/aula/page.tsx
DROP POLICY IF EXISTS "student_select_coach_admin" ON "Student";
