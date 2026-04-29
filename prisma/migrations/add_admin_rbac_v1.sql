-- RBAC v1: permissões de admin (granular opt-in) — 2026-04-27
-- Ver lib/permissions/constants.ts e ecrã /admin/permissoes

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminUseGranularPermissions" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "AdminPermission" (
  "code"       TEXT NOT NULL,
  "module"     TEXT NOT NULL,
  "labelPt"    TEXT NOT NULL,
  "labelEn"    TEXT NOT NULL,
  "sortOrder"  INT NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminPermission_pkey" PRIMARY KEY ("code")
);

CREATE TABLE IF NOT EXISTS "UserAdminPermission" (
  "userId"           TEXT NOT NULL,
  "permissionCode"  TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAdminPermission_pkey" PRIMARY KEY ("userId", "permissionCode"),
  CONSTRAINT "UserAdminPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserAdminPermission_permissionCode_fkey" FOREIGN KEY ("permissionCode") REFERENCES "AdminPermission"("code") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserAdminPermission_userId_idx" ON "UserAdminPermission"("userId");

INSERT INTO "AdminPermission" ("code", "module", "labelPt", "labelEn", "sortOrder", "createdAt")
VALUES
  ('admin:alunos:read',  'alunos',     'Alunos — ver',     'Students — read',  0, NOW()),
  ('admin:alunos:write', 'alunos',     'Alunos — editar',  'Students — write', 1, NOW()),
  ('admin:turmas:read',  'turmas',     'Aulas e turmas — ver',  'Classes — read', 2, NOW()),
  ('admin:turmas:write', 'turmas',     'Aulas e turmas — editar', 'Classes — write', 3, NOW()),
  ('admin:planos:read',  'planos',     'Planos — ver',     'Plans — read', 4, NOW()),
  ('admin:planos:write', 'planos',     'Planos — editar',  'Plans — write', 5, NOW()),
  ('admin:financeiro:read',  'financeiro',   'Financeiro — ver',     'Finance — read', 6, NOW()),
  ('admin:financeiro:write', 'financeiro',   'Financeiro — editar',  'Finance — write', 7, NOW()),
  ('admin:escolas:read',  'escolas',    'Escolas — ver',    'Schools — read', 8, NOW()),
  ('admin:escolas:write', 'escolas',    'Escolas — editar',  'Schools — write', 9, NOW()),
  ('admin:coaches:read',  'coaches',    'Coaches — ver',    'Coaches — read', 10, NOW()),
  ('admin:coaches:write', 'coaches',    'Coaches — editar',  'Coaches — write', 11, NOW()),
  ('admin:cursos:read',  'cursos',     'Cursos — ver',     'Courses — read', 12, NOW()),
  ('admin:cursos:write', 'cursos',     'Cursos — editar',  'Courses — write', 13, NOW()),
  ('admin:comercial:read',  'comercial',  'Leads e experimentais — ver',  'Leads and trials — read', 14, NOW()),
  ('admin:comercial:write', 'comercial',  'Leads e experimentais — editar', 'Leads and trials — write', 15, NOW()),
  ('admin:sistema:read',  'sistema',   'Sistema (eventos, modalid., local., aval., miss.) — ver',  'System (events, mod., loc., eval., miss.) — read', 16, NOW()),
  ('admin:sistema:write', 'sistema',   'Sistema (eventos, modalid., local., aval., miss.) — editar', 'System (events, mod., loc., eval., miss.) — write', 17, NOW())
ON CONFLICT ("code") DO NOTHING;

COMMENT ON TABLE "AdminPermission" IS 'Códigos estáveis de permissão admin (v1)';
COMMENT ON TABLE "UserAdminPermission" IS 'Ligação utilizador (ADMIN) a permissão — só aplicável com User.adminUseGranularPermissions = true';
