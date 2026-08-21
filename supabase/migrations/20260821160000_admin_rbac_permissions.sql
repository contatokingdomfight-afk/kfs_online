-- RBAC admin v1: catálogo de permissões + atribuição por utilizador (ADMIN/COACH com granular activo).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminUseGranularPermissions" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "AdminPermission" (
  "code" TEXT NOT NULL PRIMARY KEY,
  "module" TEXT NOT NULL,
  "labelPt" TEXT NOT NULL,
  "labelEn" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "UserAdminPermission" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "permissionCode" TEXT NOT NULL REFERENCES "AdminPermission"("code") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("userId", "permissionCode")
);

CREATE INDEX IF NOT EXISTS "UserAdminPermission_userId_idx" ON "UserAdminPermission" ("userId");

INSERT INTO "AdminPermission" ("code", "module", "labelPt", "labelEn", "sortOrder") VALUES
  ('admin:alunos:read', 'alunos', 'Alunos — leitura', 'Students — read', 10),
  ('admin:alunos:write', 'alunos', 'Alunos — escrita', 'Students — write', 11),
  ('admin:turmas:read', 'turmas', 'Turmas — leitura', 'Classes — read', 20),
  ('admin:turmas:write', 'turmas', 'Turmas — escrita', 'Classes — write', 21),
  ('admin:planos:read', 'planos', 'Planos — leitura', 'Plans — read', 30),
  ('admin:planos:write', 'planos', 'Planos — escrita', 'Plans — write', 31),
  ('admin:financeiro:read', 'financeiro', 'Financeiro — leitura', 'Finance — read', 40),
  ('admin:financeiro:write', 'financeiro', 'Financeiro — escrita', 'Finance — write', 41),
  ('admin:escolas:read', 'escolas', 'Escolas — leitura', 'Schools — read', 50),
  ('admin:escolas:write', 'escolas', 'Escolas — escrita', 'Schools — write', 51),
  ('admin:coaches:read', 'coaches', 'Professores — leitura', 'Coaches — read', 60),
  ('admin:coaches:write', 'coaches', 'Professores — escrita', 'Coaches — write', 61),
  ('admin:cursos:read', 'cursos', 'Biblioteca/cursos — leitura', 'Library/courses — read', 70),
  ('admin:cursos:write', 'cursos', 'Biblioteca/cursos — escrita', 'Library/courses — write', 71),
  ('admin:comercial:read', 'comercial', 'Comercial — leitura', 'Commercial — read', 80),
  ('admin:comercial:write', 'comercial', 'Comercial — escrita', 'Commercial — write', 81),
  ('admin:sistema:read', 'sistema', 'Sistema — leitura', 'System — read', 90),
  ('admin:sistema:write', 'sistema', 'Sistema — escrita', 'System — write', 91)
ON CONFLICT ("code") DO NOTHING;

ALTER TABLE "AdminPermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAdminPermission" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_permission_staff_read ON "AdminPermission";
CREATE POLICY admin_permission_staff_read ON "AdminPermission"
  FOR SELECT TO authenticated
  USING (public.kfs_is_staff());

DROP POLICY IF EXISTS user_admin_permission_staff_all ON "UserAdminPermission";
CREATE POLICY user_admin_permission_staff_all ON "UserAdminPermission"
  FOR ALL TO authenticated
  USING (public.kfs_is_staff())
  WITH CHECK (public.kfs_is_staff());

COMMENT ON COLUMN "User"."adminUseGranularPermissions" IS 'Se true (ADMIN/COACH), aplica UserAdminPermission; se false, acesso total ao backoffice (super-admin legado).';
