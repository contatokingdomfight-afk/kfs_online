# Cadastro presencial e menores sem email

Fluxo operacional para a **secretaria** criar alunos que não fazem self-service na app, mantendo controlo financeiro (planos, mensalidades, seguro).

**Relacionado:** [`FINANCEIRO_INSCRICAO_SEGURO.md`](FINANCEIRO_INSCRICAO_SEGURO.md), [`FLUXO_DE_CADASTRO_E_ONBOARDING.md`](FLUXO_DE_CADASTRO_E_ONBOARDING.md), [`PLANO_FAMILIA.md`](PLANO_FAMILIA.md).

---

## Dois modos em Admin → Alunos → Novo aluno

| Modo | Quando usar | O que acontece |
|------|-------------|----------------|
| **Enviar convite** | Adulto com email que pode receber link | `inviteUserByEmail` — email com link para definir senha; `Student.registrationMode = INVITE` |
| **Cadastro presencial** | Ficha de papel na secretaria; aluno que não quer app agora; **menores** | `createUser` com senha inicial; **sem** email de convite; `registrationMode = PRESENTIAL` |

Migração: `20260730120000_student_registration_mode.sql` — colunas `registrationMode`, `syntheticLoginEmail` em `Student`.

Código: `app/admin/alunos/actions.ts` (`createStudent`, `createStudentPresencial`), `lib/student-synthetic-email.ts`, `lib/admin-create-auth-user.ts`.

---

## Cadastro presencial — adulto

1. Admin → **Novo aluno** → **Cadastro presencial**
2. Nome, escola, **email da ficha**
3. Senha inicial: gerada automaticamente ou definida pela secretaria
4. Anotar credenciais no modal (mostradas **uma vez**)
5. Na ficha do aluno: atribuir **plano** → gera pagamentos `LATE`
6. Financeiro → **Primeiro pagamento** (inscrição) e depois mensalidades

O aluno **não precisa** de entrar na app. Se quiser mais tarde: login com email + senha da secretaria, ou «Esqueci a senha» (email real).

---

## Menores sem email

1. Marcar **Menor de idade** no formulário presencial
2. Data de nascimento + nome e telefone do **responsável**
3. O sistema gera login automático: `{nome}@alunos.kingdomfight.pt` (sufixo numérico se colidir)
4. `syntheticLoginEmail = true` — **não há caixa de correio**; contacto humano = telefone do responsável no perfil
5. Mesmo fluxo financeiro que qualquer aluno

**Limitação:** «Esqueci a senha» não funciona para email interno. A secretaria guarda a senha inicial ou repõe manualmente (fase 2: botão no admin).

**Plano família:** criar cada criança presencialmente e adicionar ao grupo em `/admin/familias`.

---

## Lista de alunos

Badges na lista (`/admin/alunos`):

- **Presencial** — conta criada pela secretaria
- **Email interno** — login `@alunos.kingdomfight.pt`

---

## Pós-cadastro (checklist secretaria)

1. Atribuir plano e modalidade (se aplicável)
2. `/admin/financeiro/primeiro-pagamento` — matrícula + seguro + 1.ª mensalidade
3. Mensalidades seguintes: cron gera `LATE`; marcar `PAID` em `/admin/financeiro/novo`
4. Ficha de adesão digital (`/adesao`): hoje o aluno/responsável preenche após login, ou documentos em papel offline (entrada admin da ficha = fase 2)

---

## Fora do MVP

- Repor senha / migrar email interno → email real no admin
- Importar campos da ficha de papel (NIF, morada, etc.) no backoffice
