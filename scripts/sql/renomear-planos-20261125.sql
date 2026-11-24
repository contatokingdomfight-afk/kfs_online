-- Nomes dos planos no estilo dos ginásios portugueses (decisão 2026-11-25). Só muda o nome.
BEGIN;
UPDATE public."Plan" SET name = 'Pack 5 Aulas',        "updatedAt" = now() WHERE id = '32873676-d3b8-48bf-8906-c103b2c20314'; -- Kingdom Week 25 €
UPDATE public."Plan" SET name = '1 Modalidade',        "updatedAt" = now() WHERE id = 'plan-presencial-i';                     -- Kingdom Fighter 55 €
UPDATE public."Plan" SET name = '2 Modalidades',       "updatedAt" = now() WHERE id = 'plan-presencial-ii';                    -- Kingdom Champion 80 €
UPDATE public."Plan" SET name = 'Livre Trânsito',      "updatedAt" = now() WHERE id = 'plan-full';                             -- Kingdom Elite 100 €
UPDATE public."Plan" SET name = 'Kids · 1 Modalidade', "updatedAt" = now() WHERE id = '2b0546dd-bd5f-4752-a52d-dc004dce059d'; -- Kingdom Kids 40 €
UPDATE public."Plan" SET name = 'Kids · 2 Modalidades',"updatedAt" = now() WHERE id = 'plan-kids-duo';                         -- Kingdom Kids Duo 65 €
UPDATE public."Plan" SET name = 'Plano Família',       "updatedAt" = now() WHERE id = 'plan-familia';                          -- Kingdom Família
COMMIT;
