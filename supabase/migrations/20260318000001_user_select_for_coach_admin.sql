-- REVERTIDO: user_select_coach_admin causava 500 (recursão RLS).
-- Coach vê users via admin client em app/coach/aula/page.tsx
DROP POLICY IF EXISTS "user_select_coach_admin" ON "User";
