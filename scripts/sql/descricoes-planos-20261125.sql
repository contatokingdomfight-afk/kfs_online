-- Descrições novas dos planos (2026-11-25). Só muda a descrição.
BEGIN;
UPDATE public."Plan" SET "updatedAt" = now(), description =
  '5 aulas por mês na modalidade à tua escolha. Ideal para quem não consegue treinar todas as semanas. Inclui a plataforma digital.'
 WHERE id = '32873676-d3b8-48bf-8906-c103b2c20314'; -- Pack 5 Aulas
UPDATE public."Plan" SET "updatedAt" = now(), description =
  'Treinos ilimitados numa modalidade à tua escolha. Inclui a plataforma digital. Com fidelização de 6 meses: 50 €/mês.'
 WHERE id = 'plan-presencial-i'; -- 1 Modalidade
UPDATE public."Plan" SET "updatedAt" = now(), description =
  'Treinos ilimitados em duas modalidades à tua escolha. Inclui a plataforma digital. Com fidelização de 6 meses: 70 €/mês.'
 WHERE id = 'plan-presencial-ii'; -- 2 Modalidades
UPDATE public."Plan" SET "updatedAt" = now(), description =
  'Acesso ilimitado a todas as modalidades de adultos, plataforma digital e ofertas sazonais (ex.: t-shirt).'
 WHERE id = 'plan-full'; -- Livre Trânsito
UPDATE public."Plan" SET "updatedAt" = now(), description =
  'Uma modalidade KIDS à escolha (Muay Thai KIDS, Jiu-Jitsu KIDS ou Boxing Kids): disciplina, respeito, coordenação e confiança num ambiente seguro e divertido.'
 WHERE id = '2b0546dd-bd5f-4752-a52d-dc004dce059d'; -- Kids · 1 Modalidade
UPDATE public."Plan" SET "updatedAt" = now(), description =
  'Duas modalidades KIDS à escolha (Muay Thai KIDS, Jiu-Jitsu KIDS ou Boxing Kids), com o mesmo foco em disciplina, respeito e confiança.'
 WHERE id = 'plan-kids-duo'; -- Kids · 2 Modalidades
UPDATE public."Plan" SET "updatedAt" = now(), description =
  'Para famílias a partir de 2 pessoas: cada membro treina no seu plano, com desconto no total e uma só mensalidade paga pelo titular. Fala connosco para montar o teu.'
 WHERE id = 'plan-familia'; -- Plano Família
COMMIT;
