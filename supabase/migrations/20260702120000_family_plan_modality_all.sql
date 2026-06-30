-- Plano família: acesso a todas as modalidades (sem escolha de modalidade única).

UPDATE public."Plan"
SET
  "modalityScope" = 'ALL',
  "updatedAt" = now()
WHERE id = 'plan-familia'
   OR name ILIKE '%famil%';
