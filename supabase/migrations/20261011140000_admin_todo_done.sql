-- «A tratar hoje» (admin): itens marcados como «Feito» — histórico e para não contactar o mesmo aluno duas vezes.
-- doneKey identifica a ocorrência (ver lib/admin-todo-rules.ts → todoDoneKey).
CREATE TABLE IF NOT EXISTS "AdminTodoDone" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('pagamentos', 'risco', 'carga', 'adesao', 'fisicas', 'experimentais')),
  "doneKey" TEXT NOT NULL,
  "studentId" TEXT REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "label" TEXT,
  "action" TEXT,
  "doneByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "doneAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "AdminTodoDone_kind_key" UNIQUE ("kind", "doneKey")
);

CREATE INDEX IF NOT EXISTS "AdminTodoDone_doneAt_idx" ON "AdminTodoDone" ("doneAt" DESC);

-- Só o servidor (service role) lê e escreve.
ALTER TABLE "AdminTodoDone" ENABLE ROW LEVEL SECURITY;
