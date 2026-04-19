# 💶 Remuneração de Coaches — Configurável (Futuro)

**Kingdom Fight School – Plataforma**

> A fórmula de pagamento dos professores **não será fixa no início**. Fica pensada para ser **configurável pela plataforma no futuro**, de forma simples.

---

## 1️⃣ Decisão inicial

- **Não** fixar uma regra de remuneração (ex.: 20€ + 0,35€ por aluno) na primeira versão.
- **Sim** preparar o sistema para que, no futuro, a administração possa **configurar pela plataforma** como os coaches são remunerados.
- Objetivo: **flexibilidade** — mudar a regra sem mudar código, quando a escola definir o modelo.

---

## 2️⃣ O que o sistema já tem (e basta para qualquer fórmula)

Os dados que qualquer regra de remuneração precisa já existem no modelo atual:

| Dado | Onde está | Uso |
|------|-----------|-----|
| Quem lecionou | `Lesson.coachId` | Por coach |
| Quando / duração | `Lesson.date`, `startTime`, `endTime` | Horas por aula / por mês |
| Quantos alunos na aula | `Attendance` com `status = CONFIRMED` | Por aula, por mês |

Com isso dá para calcular, no futuro, qualquer combinação de:
- valor fixo por aula
- valor por aluno presente
- valor por hora lecionada
- bônus por número de alunos, etc.

👉 **Nenhuma alteração obrigatória no modelo de dados do MVP**; só usar o que já existe quando a funcionalidade for ligada.

---

## 3️⃣ Visão futura: configuração pela plataforma

Quando a funcionalidade for implementada, a ideia é:

- **Admin** acessa uma área tipo “Remuneração” ou “Configuração financeira”.
- Define **regras** (ex.: valor fixo por aula, valor por aluno, valor por hora).
- Regras aplicadas por **período** (ex.: por mês) para gerar o valor a pagar a cada coach.
- **Relatório mensal por coach**: total de aulas, horas, alunos (presenças) e valor calculado.

Assim a escola pode:
- Testar um modelo no início.
- Ajustar depois (ex.: mudar valores ou critérios) **sem depender de desenvolvimento**.

---

## 4️⃣ Exemplo de regra (só referência, não fixo)

Para ilustrar o tipo de coisa que a configuração pode permitir no futuro:

- Valor fixo por aula (ex.: 20 €).
- Valor por aluno confirmado na aula (ex.: 0,35 €).

Fórmula por aula: `fixo + (valor_por_aluno × nº de presenças confirmadas)`.  
Fórmula mensal: soma das aulas do coach no mês.

**Importante:** estes números são só exemplo. O que fica definido é: **a plataforma permitirá configurar regras assim no futuro**, não que esta seja a única ou obrigatória.

---

## 5️⃣ O que NÃO fazer agora

- Não criar campos ou tabelas específicos para uma fórmula fixa (ex.: “valor fixo 20”, “valor por aluno 0,35”).
- Não implementar cálculos de remuneração no MVP, a menos que seja apenas **consulta/relatório** usando os dados já existentes (aulas + presenças).

---

## 6️⃣ O que FAZER quando for implementar

1. **Configuração (futuro):**  
   Entidade( s ) para “regras de remuneração” (ex.: tipo de regra, valores, vigência), configurável pelo admin na plataforma.

2. **Cálculo:**  
   Usar sempre `Lesson` + `Attendance` (confirmados) para:
   - horas lecionadas por coach por mês
   - alunos por aula / no mês

3. **Relatório / exportação:**  
   Tela ou export (ex.: Excel) por coach e mês: aulas, horas, alunos, valor calculado conforme a regra configurada.

4. **Manter flexível:**  
   Novos tipos de regra (por hora, bônus, etc.) entram como novas opções de configuração, não como código fixo.

---

## 7️⃣ Resumo

| Hoje (MVP) | Futuro |
|------------|--------|
| Sem fórmula fixa de remuneração | Fórmula e valores configuráveis pela plataforma |
| Dados de aula e presença já existem | Usar esses dados para qualquer regra |
| Foco em gestão de aula e presença | Relatório e pagamento de coaches quando a escola quiser |

---

## 📌 Referências nos DOCS

- **Modelo de Dados:** Lesson + Attendance já permitem qualquer cálculo futuro; ver secção “Remuneração de coaches (futuro)”.
- **Visão / Financeiro:** Remuneração de coaches listada como funcionalidade futura, configurável.

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — abril 2026.*
