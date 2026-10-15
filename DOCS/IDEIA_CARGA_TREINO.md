# Carga de treino — próximas ideias

> Documento de ideias (não é uma especificação final). Serve para decidir o que vale a pena construir, em que ordem, e o que cada coisa exige.
> Estado: proposta, 15/10/2026.

---

## 1. Onde estamos hoje

O que já existe na plataforma e serve de base:

| Peça | O que faz |
|---|---|
| **RPE do aluno** («Como foi o treino?») | Nota 1–10 no fim da aula, num toque. Dá XP. Guardada em `Attendance.rpe` com `rpeSource = STUDENT`. |
| **RPE do professor** («Esforço da aula» / «Alterar») | Nota 1–10 dada pelo professor, em bloco ou aluno a aluno. `rpeSource = COACH`. Nunca substitui a do aluno e não dá XP. |
| **Carga de treino** | `esforço (RPE) × minutos da aula`. Soma dos últimos 7 dias comparada com a média das 4 semanas anteriores (rácio). Zonas: baixa, ideal, atenção, alta. |
| **Alerta «Carga alta»** | Aparece no «A tratar hoje» quando o rácio passa de 1,5×. Há também a página `/coach/carga`. |
| **Bem-estar pré-aula** | 3 perguntas rápidas antes do treino, com zona verde / amarela / vermelha. |
| **Avaliação física** | Renova de 6 em 6 meses. Peso e altura no perfil, e registo de peso pós-treino. |

O que **não** existe: sono/prontidão diária independente de uma aula, testes de campo comparáveis no tempo, composição corporal, e uma leitura cruzada entre o que o aluno sente e o que o professor vê.

---

## 2. As quatro ideias

### A. Prontidão e sono (captura rápida diária)

**Problema.** O bem-estar de hoje só aparece quando há aula. Quem treina de manhã não responde, e não há leitura do dia anterior.

**Proposta.** Um cartão curto na Home, uma vez por dia, com **2 ou 3 botões** (sem digitar):
- Como dormiste? (mal / normal / bem)
- Como acordaste? (cansado / normal / com energia)
- Dor ou desconforto? (nenhuma / ligeira / forte, com a zona do corpo se for forte)

**Como entra na carga.** Cruza com o rácio de carga: carga alta + sono mau é muito mais relevante do que carga alta sozinha. O alerta do admin passa de «rácio 1,6» para «rácio 1,6 e dormiu mal 3 dias seguidos».

**Dados.** Uma tabela leve (`DailyReadiness`: aluno, dia, sono, energia, dor, zona). Nada de novo no fluxo de aulas.

**Esforço.** Baixo. É o mais barato e dá valor imediato.

**Riscos.** Fadiga de perguntas: se pedirmos demais, ninguém responde. Por isso máximo 3 toques e nunca bloquear nada.

---

### B. Testes de campo (assimetria e níveis por peso)

**Problema.** A avaliação física é de 6 em 6 meses e é pouco comparável: não sabemos se o aluno está a melhorar nem se tem um lado mais fraco.

**Proposta.** Um conjunto pequeno de testes que o professor regista em 2 minutos, no telemóvel:
- **Assimetria esquerda / direita**: salto unilateral, força de preensão, equilíbrio num pé, ou o teste que fizer sentido para a modalidade. O sistema calcula a diferença percentual e assinala acima de ~10–15%.
- **Níveis por peso corporal**: o resultado é expresso em relação ao peso (por exemplo, repetições de flexões, ou carga relativa), com **faixas** (iniciante, intermédio, avançado) por categoria de peso e sexo.

**Como entra no resto.** O aluno vê o seu nível e a evolução no perfil. O professor vê alertas de assimetria. Pode alimentar o requisito físico dos exames de graduação.

**Dados.** `FieldTest` (definição: nome, unidade, se é bilateral) e `FieldTestResult` (aluno, teste, data, valor esquerdo / direito, peso na altura).

**Esforço.** Médio. O difícil não é o código, é **decidir quais testes** e as tabelas de níveis, que precisam de validação de quem sabe de preparação física.

**Riscos.** Níveis mal calibrados desmotivam. Convém começar com poucos testes e rever as faixas com os dados reais da escola.

---

### C. Composição corporal (e % de gordura na avaliação física)

> Decisão de 15/10: capturar o **% de gordura** como parte da **avaliação física** (a de 6 em 6 meses), em vez de um registo à parte.

**Problema.** Só temos peso. Para modalidades com categorias, ou para acompanhar objetivos, o peso sozinho diz pouco.

**Proposta.** Registo opcional, feito pelo professor ou pelo próprio aluno:
- % de massa gorda, massa magra, ou perímetros simples (cintura, braço), consoante o método disponível na escola.
- Gráfico de evolução ao lado do peso.

**Dados.** `BodyCompositionEntry` (aluno, data, método, valores). Ligado à avaliação física existente.

**Esforço.** Baixo a médio.

**Riscos.** É um dado **sensível**: visível só para o aluno e para quem avalia, nunca no ranking nem em listas. Exige consentimento claro e a opção de não registar. Convém definir o método (balança de bioimpedância? adipómetro?) porque os números não são comparáveis entre métodos.

---

### D. Comparar o RPE do aluno com o do professor

**Como funciona hoje (e continua a valer).** Se o aluno **não responde**, conta a nota do professor. Se o aluno **responde**, fica a dele. É a nota que entra na carga de treino e no XP.

**Problema.** Os dois medem coisas diferentes: o aluno diz o que **sentiu**, o professor diz o que **viu**. Hoje, quando o aluno responde, a nota do professor é **substituída e perde-se**, por isso não dá para ver a diferença.

**Proposta.** A regra de qual nota conta **não muda**. Só passamos a guardar **também a nota do professor** quando o aluno responde, para podermos mostrar a diferença:
- **Aluno > professor** de forma repetida: sinal de sobretreino, cansaço acumulado ou dor.
- **Aluno < professor** de forma repetida: o aluno está a poupar-se, ou ainda não calibra bem o esforço.
- Quando o aluno não responde, a nota do professor continua a servir de reserva, como agora.

**Como se vê.** No perfil do aluno (visão do professor e do admin): a tendência das últimas semanas e um aviso quando a diferença média passa de 2 pontos.

**Dados.** Pequena alteração: guardar uma segunda coluna (`coachRpe`) em vez de uma única `rpe` com origem. É a única que mexe em dados existentes, por isso exige migração cuidadosa.

**Esforço.** Médio (a lógica é simples, a migração é que pede atenção).

**Riscos.** Não transformar a diferença numa «avaliação do aluno». É um sinal para conversar, não uma nota.

---

## 3. Ordem sugerida

| # | Ideia | Porquê agora |
|---|---|---|
| 1 | **A. Prontidão e sono** | Barato, usa o que já existe, e melhora logo o alerta de carga. |
| 2 | **D. RPE aluno vs professor** | Pouco código novo e muito valor para o professor. Requer uma migração. |
| 3 | **B. Testes de campo** | Valioso, mas depende de decidirmos os testes e as faixas. |
| 4 | **C. Composição corporal** | Último, por ser o mais sensível e o que mais depende do método e do consentimento. |

---

## 4. Perguntas para decidir

1. Quais testes de campo fazem sentido para o Muay Thai, o Boxing e o MMA? (e quem valida as faixas por peso?)
2. Que método de composição corporal a escola tem à mão?
3. A prontidão diária é para **todos** os alunos ou só para quem tem plano com acompanhamento de performance?
4. O professor deve ver as respostas de sono/dor de cada aluno, ou só a zona (verde / amarela / vermelha)? (privacidade)
5. Queremos que a diferença de RPE gere um alerta no «A tratar hoje», ou fica só no perfil?

---

## 5. O que **não** vamos fazer (por agora)

- Diagnósticos médicos ou recomendações clínicas. A plataforma assinala e sugere conversar, não diagnostica.
- Integração com relógios ou wearables. Pode vir depois, mas aumenta muito a complexidade.
- Mostrar estes dados no ranking ou em qualquer lista pública.
