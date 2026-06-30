# Testar com um aluno real

A plataforma está **pronta para testes com um aluno real**. O núcleo (auth, dashboard, presenças, perfil, conquistas, biblioteca, loja, **eventos com inscrições e notificações in-app**, performance) está implementado.

---

## Antes de convidar o aluno

1. **Ambiente**
   - Deploy na Vercel (ou outro) com variáveis de ambiente configuradas (Supabase URL/keys, Resend, Stripe se usares pagamentos).
   - Ou testes em local: `npm run dev` e o aluno acede pelo teu URL (ex.: ngrok ou IP local na mesma rede).

2. **Dados mínimos no Admin**
   - **Escola** ativa (Admin → Escolas).
   - **Pelo menos um plano** (Admin → Planos), idealmente um com acesso digital se quiseres testar biblioteca.
   - **Configurações** — valor do seguro anual e taxa de matrícula (`/admin/configuracoes`).
   - **Pelo menos uma aula** na semana atual (Admin → Turmas) para o aluno ver "Próxima aula" e marcar Vou/Não vou.
   - (Opcional) **Tema da Semana** (como Coach) para o aluno ver no dashboard.
   - (Opcional) **Cursos** na biblioteca e/ou na loja.

3. **Convite**
   - Admin → **Alunos** → **Convidar aluno**.
   - Introduzir o **email real** do aluno.
   - O sistema envia o convite (Resend). O aluno recebe o link para definir palavra-passe e entrar.

---

## O que o aluno pode fazer (para validar)

| Área | O que testar |
|------|----------------|
| **Login** | Abrir o link do convite (ou ir a `/sign-in`), definir palavra-passe, entrar. |
| **Escolher plano** | `/escolher-plano` — modal com taxas; confirmação cria pagamentos pendentes. |
| **Pagamento na escola** | Aluno fica em `/dashboard/financeiro` até admin registar **Primeiro pagamento**. |
| **Waiver** | `/waiver-signing` antes do plano (se ainda não assinado). |
| **Início** | Ver próxima aula, "Esta semana", plano (se atribuído), meta do mês, tema da semana, conquistas, cursos recomendados. |
| **Vou / Não vou** | Marcar intenção de presença nas aulas da semana. |
| **Check-in** | Se tiveres aula com QR: escanear ou abrir link `/check-in/[id]` no telemóvel para marcar presença. |
| **Perfil do Atleta** | Menu → Perfil do Atleta: nível, faixa, XP, radar (quando o coach registar avaliações), objetivos, feedback do coach, conteúdos sugeridos. |
| **Conquistas** | Menu → Conquistas: próxima conquista, grelha de badges, progresso. |
| **Meus dados** | Menu → Meus dados: editar nome, peso, altura, contacto, notas médicas. |
| **Biblioteca** | Se tiver plano digital ou compra: ver cursos e progresso. |
| **Loja / Eventos** | Ver cursos à venda e eventos; comprar/inscrever (Stripe se configurado). |

---

## Depois de convidar (Admin)

1. Aluno completa **waiver** e escolhe **plano** em `/escolher-plano` (fluxo presencial).
2. **Primeiro pagamento** — Admin → Financeiro → Primeiro pagamento (mensalidade + matrícula + seguro). Ver [`FINANCEIRO_INSCRICAO_SEGURO.md`](FINANCEIRO_INSCRICAO_SEGURO.md).
3. Se quiseres que ele apareça como **atleta** (para o coach dar avaliações e ver performance): Admin → **Atletas** → Criar atleta (escolher esse aluno e um coach).
4. Opcional: criar **avaliação física** (como Coach, no perfil do aluno) e **avaliações** na aula (dimensões) para o radar e metas do aluno encherem.

---

## Guia completo de testes

Para checklists detalhados por perfil (Admin, Coach, Aluno), usa o **GUIA_TESTE_VALIDACAO_PERFIS.md**, secção **3. Perfil Aluno**.

---

## Se algo falhar

- **Email de convite não chega:** Verificar Resend (API key, domínio, logs).
- **Aluno não vê aulas:** Verificar se há aulas na semana e se o plano do aluno inclui a modalidade dessas aulas.
- **Perfil do Atleta vazio:** Normal se ainda não houver avaliações; o coach pode registar na página da aula ou no perfil do atleta.
- **Aluno bloqueado após escolher plano:** Normal até o admin registar o primeiro pagamento (`PAID`).
- **Erro ao registar seguro:** Verificar migração `20260630150000_payment_reference_month_nullable.sql` aplicada na BD.

Testar com um aluno real é a melhor forma de validar o fluxo completo e a experiência móvel (dashboard no telemóvel).

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — abril 2026.*
