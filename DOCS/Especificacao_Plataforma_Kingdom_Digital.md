# Especificação da Plataforma Kingdom Digital

> Documento que descreve as funcionalidades da plataforma digital KFS a desenvolver ou expandir, alinhadas ao Plano de Negócios e à metodologia "Style Kingdom Fight".  
> Complementa o [Modelo de Dados (MVP)](./Modelo%20de%20Dados%20–%20Kingdom%20Fight%20School%20(MVP).md) e o [Fluxo Lógico Completo](./Fluxo%20Lógico%20Completo%20–%20Plataforma%20Kingdom%20Fight%20School.md).

---

## 1. Dashboard de Performance Ultra-Personalizado

O dashboard do aluno/atleta funciona como **"Perfil do Atleta"** gamificado, com visão segmentada por modalidade e evolução ao longo do tempo.

### 1.1 Implementado (MVP atual)

- **Header do atleta:** nível, faixa (cor), barra de XP até à próxima faixa. Sistema de faixas (Branca → Branca/amarela → … → Preta → Preta/Dourado → Dourado 1, 2, … N); progressão em dobro de XP (1000 XP para Branca/amarela, depois o dobro por nível). Ver `lib/belts.ts` e `lib/xp-missions.ts`.
- **Status gerais (core attributes):** cartões para Técnico, Tático, Físico, Mental, Teórico com score 1–10, barra de progresso (cores: 0–3 vermelho, 4–6 amarelo, 7–10 verde) e Média Geral.
- **Gráfico radar (Recharts):** os cinco atributos; tema Kingdom Fight (vermelho/preto); animação no carregamento.
- **Detalhe por componente (accordion):** secções por dimensão; dentro de cada uma, grupos por modalidade. O **detalhe é filtrado pela modalidade principal do aluno** (só critérios da modalidade do aluno). Cada critério mostra nome, pergunta/descrição, rating 1–5 estrelas e barra de progresso opcional.
- **Missões ativas:** missões geradas pelo sistema (ex.: “Subir Físico para X”) com recompensa de XP; **missões configuráveis** no Admin (por modalidade e por faixa); **missão de avaliação física** (realizar/renovar a cada 6 meses). Conclusão de avaliações na aula processa XP por targets de dimensão (`processMissionAwards`); missões de modelo dão XP ao completar.
- **Feedback do coach:** card de citação com avatar e texto (quando houver).

### 1.2 Métricas e KPIs por modalidade (parcial / futuro)

- Indicadores de desempenho por modalidade (Muay Thai, Boxing, Kickboxing) vêm das avaliações do coach e dos critérios configurados (Admin). O detalhe por componente já mostra evolução por modalidade (filtrada pela modalidade principal do aluno).
- Assiduidade e tendência por modalidade podem ser expandidos no futuro.

### 1.3 "Avatar" de evolução (gráfico radar)

- **Implementado:** radar com eixos Técnico, Tático, Físico, Mental, Teórico (configuráveis via Admin – GeneralDimension, EvaluationComponent, EvaluationCriterion). Baseado em avaliações do coach na aula.

### 1.4 Feedback que sugere conteúdos (por fazer)

- Com base na assiduidade e nas avaliações, sugerir conteúdos da biblioteca ao aluno (bloco "Recomendado para ti") quando a Biblioteca estiver implementada.

---

## 2. Biblioteca de Conteúdo 360º

Espaço central onde a escola disponibiliza **cursos e vídeos** para estudo técnico, mindset e performance. O acesso depende do **plano do aluno** ou da **compra avulsa**.

### 2.1 Conceito

- **Biblioteca** = catálogo de cursos e vídeos organizados por categoria (Técnica, Mindset, Performance).
- **Acesso:**
  - Alunos com planos que incluem plataforma digital (ex.: Kingdom Online, Kingdom Presencial MMA, Kingdom FULL) **acessam conforme o que o plano inclui**.
  - Alunos sem acesso a determinado conteúdo **podem comprar** cursos ou pacotes avulsos na mesma página (ver secção 6 – Receita adicional).
- A escola (admin/coach) **sobe** os cursos e vídeos; a plataforma faz a **gestão de visibilidade e de permissões** por plano e por compra.

### 2.2 Categorias de conteúdo

- **Técnica:** módulos de Jiu-Jitsu, Muay Thai, Boxe, etc. (vídeos explicativos, sequências, correções).
- **Mindset e História:** filosofia das artes marciais, psicologia do combate, história.
- **Performance:** nutrição, preparação física, recuperação, condicionamento específico para combate.

### 2.3 Funcionalidades a considerar

- Listagem de cursos/vídeos com filtros (categoria, modalidade, nível).
- Página de curso com módulos/aulas e progresso do aluno (concluído / em progresso).
- Integração com o **Dashboard de Performance**: conclusão de conteúdos pode alimentar o eixo "Teoria" do gráfico radar e as sugestões de conteúdo.

---

## 2.1 Avaliação Física (Ficha de Anamnese e Avaliação Física Inicial)

**Implementado.** Fluxo de entrada do aluno: cadastro → seleção de plano → **solicitar avaliação física**. O instrutor preenche a ficha no perfil do aluno.

### 2.1.1 Secções da ficha (formulário coach)

1. **Identificação do aluno** – pré-preenchida (nome, data nascimento, idade, sexo, altura, peso, contacto, email, data da avaliação, instrutor responsável).
2. **Objetivo do aluno** – Condicionamento, Defesa pessoal, Competição, Emagrecimento, Ganho de massa muscular, Lazer, Outro.
3. **Histórico de saúde** – Condições médicas (cardíacos, hipertensão, diabetes, asma, articulares, coluna, epilepsia, nenhuma, outros); uso de medicação; histórico de lesões (Sim/Não + especificação). *(Tabela de lesões detalhada pode ser acrescentada depois em formData.)*
4. **PAR-Q (prontidão para exercício)** – Perguntas Sim/Não (dor no peito, desmaio, problema ósseo/articular, recomendação médica, outra condição). Se alguma resposta SIM → encaminhar para avaliação médica.
5. **Nível de atividade física atual** – Sedentário, Ativo ocasional, Ativo regular, Muito ativo; experiência em artes marciais (Sim/Não, modalidade, tempo).
6. **Avaliação física inicial** – Sinais vitais (FC repouso, PA, saturação O2); mobilidade e limitações (ombro, anca, joelho, tornozelo, boa mobilidade geral); avaliação postural (normal, cabeça anteriorizada, ombros protraídos, hipercifose, hiperlordose, escoliose aparente).
7. **Testes físicos básicos** – Flexões, abdominais, prancha, agachamentos em 1 min; teste de corrida (opcional).
8. **Avaliação do instrutor** – Classificação 1–10 (condição física geral, mobilidade, coordenação, resistência, força) e observações.
9. **Termo de responsabilidade** – Declaração e assinatura do aluno (campo texto).
10. **Liberação** – Apto para treino | Apto com restrições | Necessita avaliação médica.

### 2.1.2 Regras de negócio

- **Disponibilidade:** todos os professores (coaches) acedem à avaliação física pelo **perfil do aluno** (e pelo perfil do atleta, com link para o aluno). Botão "Realizar avaliação física" ou "Nova avaliação física" conforme estado.
- **Renovação:** obrigatória **a cada 6 meses**. O sistema registra `nextDueAt = assessedAt + 6 meses`. Quando `nextDueAt` for hoje ou passado, a missão "Renovar avaliação física" volta a aparecer no dashboard do aluno.
- **Missão para o aluno:** "Realizar avaliação física" / "Renovar avaliação física (obrigatório a cada 6 meses)" aparece nas **Missões ativas** do Perfil do atleta até estar em dia. XP da missão pode ser 0 (obrigatório de saúde).

Dados guardados em `StudentPhysicalAssessment` (assessedAt, nextDueAt, clearance, formData JSONB). Ver `lib/physical-assessment-types.ts` e `app/coach/alunos/[id]/avaliacao-fisica/`.

---

## 3. Gamificação e Presença

Reforçar a motivação através de **conquistas** e **metas de assiduidade**, ligadas ao check-in digital já existente.

### 3.1 Badges e conquistas

- **Check-ins digitais** (presença confirmada nas aulas) devem gerar **badges/conquistas**.
- Exemplos de badges:
  - Primeira aula, 5 aulas, 10 aulas, 25 aulas, 50 aulas, etc.
  - Sequência de semanas (ex.: "3 semanas seguidas").
  - Por modalidade (ex.: "10 aulas de Muay Thai").
  - Eventos especiais (camps, workshops).
- As conquistas devem ser visíveis no perfil do aluno e, se desejado, num "card" ou secção resumida no dashboard.

### 3.2 Metas de assiduidade

- Definir **metas de assiduidade** (ex.: "X aulas por mês" ou "Y aulas por modalidade no trimestre").
- A plataforma deve:
  - Mostrar a meta e o progresso atual (ex.: 8/10 aulas este mês).
  - Alertar ou celebrar quando o aluno atinge a meta.
- Metas podem ser **globais** (configuração da escola) ou **personalizadas** pelo coach para o atleta.

---

## 4. Sala de Aula Invertida

Metodologia em que o aluno **estuda a teoria no app** e **maximiza a prática no tatame**.

### 4.1 "Tema da Semana"

- O **professor/coach** define um **"Tema da Semana"** (ou por aula/turma), associado à modalidade e ao conteúdo programático.
- Esse tema fica visível para os alunos da turma (ou da modalidade) no app.

### 4.2 Teoria em vídeo no app

- O aluno **visualiza a teoria em vídeo** na plataforma (vídeo curto, ex.: 5 min, explicando o movimento ou conceito).
- O vídeo pode ser:
  - Um item da **Biblioteca** (curso ou vídeo avulso) associado ao "Tema da Semana".
  - Ou um conteúdo específico do tipo "Tema da Semana" gerido pela equipa (upload e associação ao tema).
- Objetivo: o aluno chega à aula já com a teoria vista; no tatame o tempo é dedicado à prática e correção.

### 4.3 Fluxo resumido

1. Coach define "Tema da Semana" (e opcionalmente associa um vídeo da biblioteca ou um vídeo dedicado).
2. Alunos veem o tema e o vídeo na app (na área de aluno/dashboard ou secção "Esta semana").
3. Aluno assiste ao vídeo antes (ou depois) da aula.
4. Na aula presencial: prática e feedback do coach; o check-in e as avaliações continuam a alimentar o dashboard e a gamificação.

---

## 5. Planos e Preços – Gestão na Plataforma

A plataforma deve fazer a **gestão de planos** e a **atribuição de plano por aluno**, alinhada à tabela de preços do Plano de Negócios.

### 5.1 Planos a gerir

- **Kingdom Online (Plano Digital):** acesso à plataforma digital (cursos/vídeos conforme catálogo). Valor de referência: €20/mês.
- **Kingdom Presencial Modalidade (Plano I):** acesso presencial a uma modalidade; sem inclusão de plataforma digital. Valor de referência: €40/mês.
- **Kingdom Presencial MMA (Plano II):** acesso presencial a todas as modalidades + acesso à plataforma digital. Valor de referência: €80/mês.
- **Kingdom FULL (Plano III):** acesso ilimitado ao ginásio (todas as modalidades) + plataforma digital + benefícios sazonais (ex.: camiseta). Valor de referência: €100/mês.

### 5.2 Funcionalidades necessárias

- **Cadastro de planos** na plataforma: nome, descrição, preço, o que inclui (presencial, digital, modalidades, etc.).
- **Atribuição de plano por aluno:** cada aluno (Student) tem um plano ativo; a plataforma controla o que o aluno pode acessar (ex.: biblioteca, apenas conteúdos incluídos no plano).
- **Renovação e pagamento:** a gestão pode ser apenas "plano X atribuído até data Y" (com pagamentos registados no módulo financeiro existente) ou, no futuro, integração com cobrança recorrente.
- **Impacto na Biblioteca:** ao listar cursos/vídeos, o sistema verifica se o aluno tem acesso pelo plano ou por compra avulsa; caso não tenha, mostra opção de compra (ver secção 6).

---

## 6. Receita Adicional – Cursos, Camps e Workshops na Plataforma

Produtos e eventos que aumentam a margem (Camps, Workshops, cursos avulsos) devem ter **uma página (ou área) na plataforma** onde são listados; alunos que não têm acesso pelo plano **podem comprar** para aceder.

### 6.1 Conceito

- **Mesma área da Biblioteca / Cursos:** onde já existem cursos e vídeos.
- Conteúdos podem ser:
  - **Incluídos no plano** (conforme secção 5).
  - **Só por compra:** ex.: Kingdom Fight Camp, Workshop específico, curso avulso de técnica avançada.
- Alunos que não têm acesso a um curso (por não estar no plano) veem o curso listado com opção **"Comprar"** ou **"Inscrever-me"** (no caso de evento com data).

### 6.2 Tipos de produto

- **Cursos / vídeos avulsos:** compra única para desbloquear acesso ao conteúdo (técnica, mindset, performance).
- **Kingdom Fight Camp:** fins de semana imersivos (básico, intermediário, avançado, instrutor); inscrição com data e valor (ex.: €50–€250).
- **Kingdom Fight Workshops:** workshops com atletas/instrutores; inscrição com data e valor (ex.: €50–€250).

### 6.3 Funcionalidades a considerar

- Página (ou secção) "Cursos e Eventos" ou "Loja de Conteúdo" com:
  - Listagem de cursos e eventos.
  - Filtro: incluído no meu plano / pago / todos.
  - Botão "Comprar" ou "Inscrever-me" quando aplicável.
- Registo da compra/inscrição (vínculo aluno–produto/evento) e, se necessário, integração com o módulo **Financeiro** (pagamento registado).
- Após compra/inscrição, o aluno passa a ter acesso ao conteúdo ou ao evento (presencial/digital conforme o produto).

---

## Resumo de prioridades (sugestão)

| Área                         | Descrição resumida                                                                 |
|-----------------------------|-------------------------------------------------------------------------------------|
| Planos e preços             | Gestão de planos + atribuição por aluno; base para acesso à biblioteca e receita.  |
| Biblioteca 360º             | Catálogo de cursos/vídeos; acesso por plano ou compra.                             |
| Sala de Aula Invertida      | Tema da Semana + teoria em vídeo no app.                                            |
| Dashboard performance       | KPIs por modalidade, gráfico radar, sugestões de conteúdo.                          |
| Gamificação                 | Badges por check-ins, metas de assiduidade.                                         |
| Receita adicional           | Página de cursos/eventos com compra para quem não tem acesso.                       |

Este documento deve ser atualizado à medida que as funcionalidades forem implementadas ou que novas decisões de produto forem tomadas.
