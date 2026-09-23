-- Controlo do arquivo físico dos documentos de adesão: depois de assinados (digitalmente ou em
-- papel), a escola ainda precisa de imprimir e arquivar os 3 documentos numa pasta física por
-- aluno. Sem isto, um aluno que assina tudo digitalmente desaparece da lista de pendentes sem
-- nenhum sinal de que falta imprimir/arquivar (ver /admin/documentos-adesao).
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "physicalDocumentsFiledAt" TIMESTAMPTZ;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "physicalDocumentsFiledByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL;
