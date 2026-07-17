-- Plano família: sem limite máximo de membros por grupo (mínimo comercial: 2 pessoas).

ALTER TABLE public."FamilyGroup"
  DROP COLUMN IF EXISTS "maxMembers";

UPDATE public."Plan"
SET
  description = 'Pacote familiar a partir de 2 pessoas: todas as modalidades, biblioteca digital, performance e check-in ilimitado. Mensalidade com desconto face ao individual; gestão na secretaria.',
  "updatedAt" = now()
WHERE id = 'plan-familia';
