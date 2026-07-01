-- Plano família: mensalidade individual 80 €/pessoa (desconto face ao FULL).

UPDATE public."Plan"
SET
  "priceMonthly" = 80.00,
  description = 'Plano familiar com acesso equivalente ao Kingdom Presencial MMA: todas as modalidades, biblioteca digital, performance e check-in ilimitado. Mensalidade de 80 € por pessoa no grupo; gestão na secretaria.',
  "updatedAt" = now()
WHERE id = 'plan-familia'
   OR lower(name) LIKE '%famil%';

-- Corrigir mensalidades LATE pendentes para o valor por pessoa.
UPDATE public."Payment" p
SET amount = 80.00
FROM public."FamilyGroupMember" fgm
JOIN public."FamilyGroup" fg ON fg.id = fgm."familyGroupId" AND fg."isActive" = true
WHERE p."studentId" = fgm."studentId"
  AND p."paymentType" = 'TUITION'
  AND p.status = 'LATE'
  AND p.amount <> 80.00;

-- Associar mensalidades existentes ao grupo familiar.
UPDATE public."Payment" p
SET "familyGroupId" = fgm."familyGroupId"
FROM public."FamilyGroupMember" fgm
JOIN public."FamilyGroup" fg ON fg.id = fgm."familyGroupId" AND fg."isActive" = true
WHERE p."studentId" = fgm."studentId"
  AND p."paymentType" = 'TUITION'
  AND p."familyGroupId" IS NULL;
