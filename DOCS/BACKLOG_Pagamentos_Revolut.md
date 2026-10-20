# Backlog — Pagamentos online e confirmação automática (Revolut)

Estado em **20 out. 2026**: pausado. A Revolut não está a colaborar (Business API só no plano de 30 €/mês; conta de comerciante em análise). Tudo o que ficou feito está inativo e sem custos.

## Situação atual (o que se mantém)

- Alunos pagam **mensalidades por transferência** (IBAN ou Revtag `@kingdom_01`); o admin **marca à mão** em Financeiro → Receber.
- **Numerário:** regista-se logo como «Dinheiro» (é a receita). O depósito na conta pessoal e a transferência para a Kingdom são só movimento de dinheiro, **não** são receita nova e não se marcam como pagamento de ninguém. Vale a pena confirmar com o contabilista se o numerário deve ser depositado direto na conta da empresa.
- **Loja:** encomendas por transferência/secretaria, confirmadas à mão (Loja → Encomendas).
- **Academy:** cursos e Passe pagam-se por **Stripe** (já a funcionar).

## O que já está feito e publicado (commit 7c662bf)

| Peça | Onde | Estado |
|---|---|---|
| Referência fixa por aluno `KFS-0101`…`KFS-0162` (coluna `Student.paymentCode`) | BD + Financeiro do aluno junto ao IBAN | **Ativo e útil** |
| Leitor de transferências (Business API, só leitura): ligação OAuth, sincronização, tabelas `RevolutConnection`, `BankTransaction`, `BankPayerAlias` | `lib/revolut/*`, `app/api/revolut/*`, `app/api/cron/revolut-sync` | Inativo (faltam variáveis `REVOLUT_*`) |
| Correspondência automática (referência KFS, nome + valor, aprende pagadores) com 10 testes | `lib/revolut/match.ts`, `reconcile.ts` | Inativo, testado |
| Ecrã Financeiro → Revolut (confirmar, associar, ignorar) | `app/admin/financeiro/banco` | Visível mas a dizer «configura as variáveis REVOLUT_*» |
| Lista «Por receber» e registo de mensalidade passados para `lib/finance/*` | usado também pelo admin de hoje | **Ativo** (sem mudança de comportamento) |

Certificado de teste criado em `C:\Users\Oseia\Documents\kfs_revolut_cert\` (**fora** do repositório; o `privatecert.pem` nunca deve ir para o git nem para o chat). Pode apagar-se se não se retomar.

## Para retomar — por ordem

### A. Confirmação automática das transferências (Business API)
**Bloqueio:** o separador «API empresarial» da Revolut Business pode exigir o plano de 30 €/mês. Não foi confirmado.
1. Revolut Business → ⚙️ → API → **API empresarial** → «Adicionar certificado de API». Se deixar:
   - colar o conteúdo de `publiccert.cer`; redirect URI `https://www.kingdomfight.com/api/revolut/callback`; copiar o **ClientID**.
2. Vercel (Production): `REVOLUT_CLIENT_ID`, `REVOLUT_PRIVATE_KEY` (conteúdo de `privatecert.pem`), `REVOLUT_REDIRECT_URI`; redeploy. Para testar antes: `REVOLUT_ENV=sandbox`.
3. Admin → Financeiro → Revolut → **Ligar à Revolut** (2FA). Opcional: registar o webhook `https://www.kingdomfight.com/api/revolut/webhook`.
4. Verificar as primeiras correspondências e afinar as regras (seguros e matrículas nunca são automáticos).

Alternativas sem plano pago: importar o extrato CSV da Revolut (não era necessário para já); agregador Open Banking (disponibilidade por confirmar).

### B. Botão «Pagar com Revolut» (Merchant API)
**Bloqueio:** pedido da conta de comerciante «em análise». Ainda sem chaves de API.
1. Quando aprovada: gerar chaves em **modo de teste (Sandbox)** no painel Revolut → API → API de comerciante.
2. Construir o checkout nas mensalidades e na loja (mesmo padrão do Stripe da Academy), com webhook que marca como pago.
3. Métodos que a página de preços indica: cartão Visa/Mastercard e carteiras digitais, Revolut Pay, Pay by Bank. **Débito direto não aparece**; confirmar com a Revolut.
4. Há também um módulo **Subscrições** (cobrança recorrente) que poderia cobrar a mensalidade todos os meses.

Custos indicados pela Revolut (a confirmar na conta): cartões europeus pessoais, Revolut Pay e Pay by Bank 1% + 0,20 € (Pay by Bank limitado a 5 €); cartões empresariais/internacionais 2,8% + 0,20 €. Numa mensalidade de 55 € ≈ 0,75 €; recebimento no dia seguinte.

### C. Pequenas melhorias possíveis
- Esconder o separador «Revolut» enquanto não estiver configurado.
- **«Caixa» de numerário** no Financeiro: dinheiro recebido ainda por depositar e registo de cada depósito.
- Mensagem de WhatsApp de lembrete já com a referência `KFS-…`.

## Decisões já tomadas
- Só **leitura** na Business API (scope `READ`): a plataforma nunca faz pagamentos nem transferências.
- Seguros e matrículas nunca são confirmados automaticamente.
- Chaves e certificados privados nunca passam pelo chat nem pelo repositório; quem os coloca na Vercel é o administrador.
