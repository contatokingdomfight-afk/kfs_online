# Backlog — Multi-escola (PM Team)

Registado em 2026-11-05, a partir das decisões e do estado de 29/10 a 31/10. **Reverificado no código em 2026-11-10** (✅ feito · ❌ por fazer · ❓ não dá para confirmar pelo código).

## Contexto

Kingdom Fight passa a **PM Team**, com várias escolas isoladas no mesmo repositório. Perfis: Admin Geral (toda a rede) · Diretor Técnico (preso à sua escola) · Professor · Aluno. Mockup: `DOCS/mockup-multi-escola.html`.

Fases 1 e 2 estão aplicadas em PRD (BD, escopo por escola em financeiro, alunos, turmas, graduação, coach e admin). Já existem o ecrã `/admin/escolas`, os pagamentos do aluno por escola, o contrato de adesão por escola e o pagamento online por conta Revolut de cada escola.

## Antes de abrir a 2.ª escola (bloqueantes)

- ❓ **Revisão por advogado** das cláusulas 4.1, 9.1, 9.3, 33.1, 34 e 35 do contrato.
- ❓ Cada escola tem de ter os **dados legais** preenchidos (sem eles não se assina nem a escola abre).
- ❓ Testar em **Preview (https)** a ligação da conta Revolut da escola e o webhook `?school=<id>`.
- ❓ A Business API (confirmação de transferências por escola) **nunca foi ligada em PRD nem testada** contra a Revolut.
- ✅ As migrações de 30/10 e 31/10 estão todas em `origin/main` (o `dev` e o `origin/main` estão iguais).

## Decisões ainda por implementar

1. ❌ **Planos híbridos (Fase 1b).** O Admin Geral define o catálogo e as regras; o diretor ajusta o preço dentro de limites e cria promoções locais. Adiado.
2. ❌ **Graduação híbrida** (`SchoolGraduationOverride`, não existe no código). A rede define graus, ordem, XP e critérios mínimos. O diretor pode acrescentar critérios (nunca baixar), ajustar tempo e presenças mínimas ±25 %, juntar técnicas e vídeos, e decidir datas e examinadores.
3. ❌ **Validação do Admin Geral nos 3 últimos graus** de cada modalidade: contam já no ranking da escola, mas no global só depois de validados.
4. ✅ **Ranking**: `/dashboard/rank` já filtra por escola (`?school=`) a partir da escola do aluno.
5. ❌ **Aba «Relatório geral»** do Admin Geral e partilha de relatórios por área com o diretor. A tabela `ReportAccessGrant` existe (migração da fase 1), mas não há ecrã.
6. ❓ **Biblioteca gratuita** para todos os alunos, só com trilhas de aprendizagem. Já existe um modo grátis (`isFreeTierLibrary` em `app/dashboard/biblioteca/page.tsx`); falta confirmar se mostra só as trilhas.
7. ❓ **Cursos pagos da Academy** saem da plataforma para a loja separada. Ainda se vendem por Stripe (`app/api/stripe/academy-checkout`); falta confirmar se o `/academy` atual conta como a loja separada.
8. **Loja por escola desligada** por agora (decisão, nada a fazer até ser retomada).

## Pagamentos por escola

- Cada escola tem os seus meios (Revolut, IBAN, MB Way…), configurados pelo diretor. Uma conta Revolut por escola (decidido 2026-10-31). A Sede continua nas variáveis de ambiente.
- **Multibanco**: à espera de fornecedor.
- ✅ `SchoolPaymentSecret` feito (`lib/payment-secrets.ts`, migrações de 31/10, commit `8a66922`): Revolut online por escola no código. Falta o teste em Preview indicado acima.
- Ver também `BACKLOG_Pagamentos_Revolut.md`.

## Rebrand

- ❌ (só aparece em migrações e testes) Mudar o nome Kingdom Fight → PM Team nos textos, emblema e domínio (por definir quando e com que ordem). Ver a memória do emblema antes de mexer em ícones (`?v=`, `SW_VERSION`).
