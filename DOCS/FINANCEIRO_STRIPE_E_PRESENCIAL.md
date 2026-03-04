# Financeiro: Pagamentos e Faturação (Portugal)

## Stripe e faturação em Portugal

**A Stripe não é aceite pelas Finanças (AT) como software de faturação.** Em Portugal, as faturas têm de ser emitidas por **software de faturação certificado pela Autoridade Tributária** (Portaria n.º 363/2010, requisitos técnicos: SAF-T PT, ATCUD, comunicação com a AT, etc.). A Stripe é um **processador de pagamentos** (cobrança), não um programa de faturação certificado.

**Conclusão:** Usar a Stripe para **cobrar** (cartão, subscrição) é compatível com a lei; a **emissão da fatura** (documento fiscal válido para a AT) tem de ser feita por software certificado.

---

## Opção mais simples: usar só um software certificado (ex.: Vendus)

**Sim, em teoria é mais fácil (e muitas vezes mais barato) não usar a Stripe e usar apenas uma ferramenta que seja certificada pela AT e que também faça cobrança.**

Se usares **Stripe + software de faturação** (ex.: Moloni), pagas:
- Comissões Stripe (por transação)
- Assinatura do software de faturação

Se usares **só um software certificado que inclua pagamentos** (ex.: **Vendus**), pagas:
- Assinatura do Vendus
- Comissão do Vendus Pay (cobrança), desde ~1% (sem custos fixos como na Stripe)

Assim evitas duplicar: uma única ferramenta para faturação (aceite pelas Finanças) e para cobrança online.

---

### Vendus (Cegid Vendus)

- **Certificado AT** – Programa nº 2230. Faturação em conformidade com a AT (comunicação em tempo real, SAF-T, etc.).
- **Vendus Pay** – Cobrança integrada: **Multibanco**, **MB Way**, **cartão**, Apple Pay, Google Pay. Link ou QR para o cliente pagar; pagamentos associados às faturas. Comissões desde 1%, sem custos fixos.
- **API** – Tem API para integração (criar clientes, documentos, etc.). Documentação: [Vendus – Implementar API](https://www.vendus.pt/ajuda/implementar-api-vendus/); **referência da API (endpoints, etc.):** [Vendus API (ws)](https://www.vendus.pt/ws/).
- **Uso** – Software em cloud, focado em PME (retalho, serviços). Integra também MB Way Comerciantes (TPA na escola) se contratualizado com o banco.

**Daria para integrar com a KFS?** Sim. A KFS poderia chamar a API do Vendus para:
- Criar/sincronizar o cliente (aluno)
- Criar o documento de fatura (mensalidade) e obter o link de pagamento (Vendus Pay)
- Opcionalmente receber webhook ou consultar estado quando o pagamento for confirmado, e atualizar o `Payment` na KFS

**Daria para usar só o Vendus?** Sim. Faturação + cobrança online ficam no Vendus; a KFS pode limitar-se a registar o que foi pago (manual ou via integração) e a mostrar ao aluno o link de pagamento gerado pelo Vendus. Para pagamentos na escola (dinheiro/TPA), continuas a usar “Registar pagamento” na KFS e, se quiseres fatura automática, a KFS pode pedir ao Vendus para emitir a fatura via API.

*Outros certificados com API (só faturação; cobrança seria Stripe ou outro):* Moloni ([moloni.pt/dev](https://www.moloni.pt/dev/)), etc. Lista oficial: [Portal das Finanças – Programas certificados](https://www.portaldasfinancas.gov.pt/pt/consultaProgCertificadosM24.action).

---

### Pagamento recorrente (débito automático da conta do aluno)

Faz todo o sentido o aluno não ter de “lembrar-se” de pagar todos os meses: **uma vez autorizado, o valor é debitado automaticamente** (cartão ou conta bancária).

**Tem como fazer subscrição com o Vendus?** Na documentação pública da API ([vendus.pt/ws](https://www.vendus.pt/ws/)) **não aparece** nenhum recurso dedicado a subscrições ou cobrança recorrente ao cliente (ex.: endpoint “subscriptions” ou “recurring”). A API expõe Account, Clients, Documents (faturas), Products, etc. – ou seja, dá para criar clientes e faturas por API, mas não está documentado um fluxo de “subscrição = cobrança automática mensal”. Por isso **não dá para afirmar só pela documentação** que o Vendus faz subscrição nesse sentido; o ideal é **confirmar com o suporte Vendus** (chat, 308 801 250) se existe subscrição/cobrança recorrente e como ativar.

- **O que a documentação pública do Vendus mostra hoje:** O Vendus Pay gera um **link de pagamento por fatura** (Multibanco, MB Way, cartão). Ou seja, a cada mês emitirias a fatura e enviarias o link; o aluno teria de abrir e pagar (ou usar a referência Multibanco). Não é o mesmo que “débito automático” sem intervenção do aluno.
- **Débito direto SEPA (conta bancária):** Em Portugal é comum para ginásios/escolas: o aluno assina uma **Autorização de Débito em Conta (ADD)** uma vez e, depois, a escola pode mandar debitar o valor mensalmente. Isto depende de o **Vendus ou o Vendus Pay** suportarem débito direto SEPA (mandato + cobranças recorrentes). A documentação online não detalha isso de forma clara.
- **Cartão guardado + cobrança mensal:** Outra opção é o aluno guardar o cartão uma vez e a escola cobrar automaticamente cada mês (tipo subscrição). A Stripe faz isto muito bem; no Vendus Pay não está explícito se existe “cartão guardado” com cobrança recorrente.

**Recomendação:** Perguntar diretamente ao **suporte Vendus** (chat, email ou 308 801 250):
1. Existe **pagamento recorrente** (débito automático)? Por exemplo: débito direto SEPA e/ou cartão guardado com cobrança mensal automática.
2. Se sim, como se configura (mandato SEPA, guardar cartão, etc.) e se há webhook/API para a KFS saber quando o pagamento foi debitado.

Se o Vendus **não** tiver cobrança verdadeiramente recorrente (sem o aluno clicar todos os meses), as alternativas são:
- **Vendus só para faturação** + **Stripe (ou outro)** para a parte da subscrição (cartão guardado, cobrança automática); quando a Stripe confirma o pagamento, a KFS regista e pode pedir ao Vendus para emitir a fatura via API.
- Ou usar um agregador de pagamentos em Portugal que faça **débito direto SEPA** (ex.: [EuPago](https://www.eupago.pt/meios-de-pagamento/debito-direto)) e integrar com o Vendus/KFS conforme a oferta deles.

---

## Alternativa: Stripe + software só de faturação

Se já tiveres Stripe ou preferires manter cartão/assinatura pela Stripe:

| Função | Onde fazer |
|--------|------------|
| **Cobrança** | Stripe (cartão, subscrição) |
| **Faturação** | Software certificado AT (ex.: Moloni, Vendus) via API |

Pagas: comissões Stripe + assinatura do software de faturação. A KFS regista o pagamento (webhook Stripe) e chama a API do software certificado para emitir a fatura.

---

## Fluxos na KFS (resumo)

1. **Só Vendus (recomendado para evitar duplicar custos)** – Faturação e link de pagamento (MB, MB Way, cartão) no Vendus; KFS integra por API (criar fatura, obter link, atualizar estado de pagamento). Presencial: registo manual na KFS + opcional emissão de fatura no Vendus.
2. **Stripe + Moloni/Vendus** – Cobrança na Stripe; faturação no software certificado via API quando o pagamento for PAID.
3. **Só presencial** – Sem cobrança online; “Registar pagamento” na KFS e faturação manual no software certificado (ou futura integração API).

---

## Estado atual na KFS

- **Gerar mensalidades do mês**: Cria `Payment` (LATE) para alunos com plano sem pagamento no mês.
- **Registar pagamento**: Formulário manual para marcar como PAID (presencial).
- **Webhook Stripe**: Cria `Payment` PAID quando a Stripe confirma o pagamento.
- **Faturação legal**: Ainda não integrada; deve ser feita via software certificado (integrar quando houver um fornecedor escolhido).

---

## Nota técnica

Os inserts em `Payment` (Supabase) devem incluir sempre o campo `id` (UUID). Corrigido em: `lib/renewals.ts` e `app/api/stripe/webhook/route.ts`.
