-- Catálogo plano família: descrição com capacidade; cópias manuais fora do self-service.

UPDATE public."Plan"
SET
  name = 'Kingdom Família',
  description =
    'Pacote familiar para até 4 pessoas: todas as modalidades, biblioteca digital, performance e check-in. Uma mensalidade no titular; matrícula e seguro individuais. A secretaria cria o grupo e adiciona cada membro.',
  "modalityScope" = 'ALL',
  "updatedAt" = now()
WHERE id = 'plan-familia';

-- Planos duplicados «Familly»/família criados à mão: desactivar para não aparecerem no catálogo admin/escolher-plano.
-- Alunos já atribuídos mantêm o planId até a secretaria migrar para plan-familia.
UPDATE public."Plan"
SET
  "isActive" = false,
  "updatedAt" = now()
WHERE id <> 'plan-familia'
  AND name ILIKE '%famil%';
