# Guia de Teste e Validação por Perfil

> Testes e critérios de validação para cada perfil da plataforma KFS: **Admin**, **Professor (Coach)** e **Aluno**.

---

## Índice

1. [Perfil ADMIN](#1-perfil-admin)
2. [Perfil Professor (Coach)](#2-perfil-professor-coach)
3. [Perfil Aluno](#3-perfil-aluno)

---

## 1. Perfil ADMIN

### 1.1 Acesso e autenticação

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | Aceder à aplicação (ex.: `/`) | Página inicial ou redirecionamento para login |
| 2 | Fazer login com conta **Admin** (email/senha ou Google conforme config) | Redirecionamento para `/admin` |
| 3 | Verificar barra lateral | Menu "Admin" com todas as secções; opção "Ver como Aluno" / "Ver como Coach" no header |

### 1.2 Menu e rotas disponíveis

Validar que o Admin vê e acede a:

| Menu | Rota | Descrição |
|------|------|------------|
| Início | `/admin` | Resumo / home do admin |
| Escolas | `/admin/escolas` | Listar e gerir escolas |
| Alunos | `/admin/alunos` | Listar, convidar, editar alunos; atribuir plano; atalho "Acesso total" |
| Atletas | `/admin/atletas` | Listar atletas; criar atleta a partir de aluno (coach, nível) |
| Turmas / Aulas | `/admin/turmas` | Listar aulas; criar e editar aula (modalidade, data, coach, capacidade) |
| Locais | `/admin/locais` | Gerir locais da escola |
| Modalidades | `/admin/modalidades` | Gerir modalidades (Muay Thai, Boxe, Kickboxing, etc.) |
| Planos | `/admin/planos` | Listar, criar e editar planos (preço, acesso digital, âmbito modalidades) |
| Cursos / Biblioteca | `/admin/cursos` | Listar cursos; criar/editar curso; módulos e unidades; co-criadores |
| Eventos | `/admin/eventos` | Listar, criar e editar eventos (Camps, Workshops) |
| Configurações | `/admin/configuracoes` | Meta de assiduidade global; outras configs |
| Presença | `/admin/presenca` | Lista de presenças (próximas 2 semanas); link para aula do coach |
| Dimensões gerais | `/admin/componentes-gerais` | Configuração de dimensões (avaliação) |
| Critérios de avaliação | `/admin/avaliacao` | Configuração de critérios por modalidade |
| Missões | `/admin/missoes` | Listar missões; criar missão; **Importar missões padrão** (seed) |
| Financeiro | `/admin/financeiro` | Listar pagamentos; filtros; **Renovações do mês**; Gerar mensalidades; links Compras/Coaches |
| Experimentais | `/admin/experimentais` | Listar pedidos aula experimental; registar novo; converter em aluno |
| Coaches | `/admin/coaches` | Listar coaches; convidar; editar (nome, valor/hora, autorização cursos) |

### 1.3 Fluxos principais a testar

#### A) Ciclo aluno: convite → plano → presença

1. **Convidar aluno:** Admin → Alunos → Convidar (email). Verificar que o convite é enviado e que, após o aluno se registar, aparece na lista com status Ativo/Experimental.
2. **Atribuir plano:** Editar aluno → escolher Plano → Guardar. No dashboard do aluno (ver como Aluno) deve aparecer "O teu plano" com o nome e preço.
3. **Atalho acesso total:** Editar aluno → bloco "Acesso rápido" → "Atribuir acesso total (plataforma + ginásio)". Só funciona se existir um plano com acesso digital e todas as modalidades; o plano do aluno deve ser atualizado.
4. **Presença:** Admin → Presença. Ver aulas próximas e link "Aula" que leva à gestão da aula (como coach).

#### B) Financeiro e renovação automática

1. **Renovações do mês:** Admin → Financeiro. Secção "Renovações do mês (MM/AAAA)" deve listar alunos com plano que não têm pagamento nesse mês.
2. **Registar pagamento:** Clicar "Registar pagamento" numa linha de renovação (ou em "Registar pagamento" no topo). Verificar que aluno, mês e valor vêm preenchidos quando se vem da renovação. Guardar com status Pago.
3. **Gerar mensalidades:** Na secção Renovações, clicar "Gerar mensalidades do mês (N alunos)". Deve criar um pagamento "Em atraso" por aluno pendente e mostrar "Mensalidades geradas: X. Já existiam: Y." A lista de pagamentos abaixo deve incluir os novos.
4. **Filtros:** Filtrar por "Pago" e "Em atraso" e verificar que a lista atualiza.

#### C) Turmas e aulas

1. **Criar aula:** Admin → Turmas → Criar aula. Preencher modalidade, data, horário, coach, local, capacidade. Guardar.
2. **Editar aula:** Clicar numa aula na lista → alterar dados → Guardar.
3. **Cancelar aula:** Na edição da aula, usar ação de cancelar/apagar (se existir) e confirmar.

#### D) Cursos e biblioteca

1. **Criar curso:** Admin → Cursos → Novo curso. Nome, categoria, modalidade; opcional: disponível para compra, preço. Guardar.
2. **Editar curso e conteúdo:** Abrir curso → secção "Conteúdo do curso" em primeiro. Adicionar Módulo → Adicionar Unidade (título, URL vídeo). Recolher "Dados do curso" se necessário. Guardar.
3. **Co-criadores:** Na edição do curso, adicionar co-criador (coach). Verificar que aparece na lista e que pode ser removido.

#### E) Missões

1. **Importar missões padrão:** Admin → Missões → "Importar missões padrão". Deve inserir dezenas de missões (sem duplicar nomes). Mensagem de sucesso com inseridas/ignoradas.
2. **Criar missão manual:** Preencher nome, descrição, modalidade (ou Todas), faixa (ou Qualquer), XP. Guardar. A missão deve aparecer na lista.
3. **Eliminar missão:** Clicar eliminar numa missão e confirmar. Deve desaparecer da lista.

#### F) Configurações e experimentais

1. **Meta de assiduidade:** Admin → Configurações → Meta (ex.: 8 aulas/mês). Guardar. No dashboard do aluno deve refletir na "Meta do mês".
2. **Experimentais:** Registar novo experimental (nome, contacto, modalidade, data). Converter em aluno: o sistema envia convite e cria registo de aluno quando aplicável.

### 1.4 Checklist de validação – Admin

- [ ] Login como Admin redireciona para `/admin`
- [ ] Todos os itens do menu Admin estão acessíveis
- [ ] Convidar aluno e atribuir plano funciona
- [ ] Atalho "Acesso total" atribui plano correto quando existe
- [ ] Financeiro: lista de pagamentos e filtros funcionam
- [ ] Secção "Renovações do mês" mostra apenas alunos com plano sem pagamento no mês
- [ ] "Gerar mensalidades do mês" cria pagamentos em atraso e mostra feedback
- [ ] Registar pagamento com query params (da renovação) pré-preenche formulário
- [ ] Criar/editar aula (turma) e ver em Presença
- [ ] Criar/editar curso com módulos e unidades
- [ ] Importar missões padrão e criar/eliminar missão
- [ ] Configurações: meta de assiduidade guarda e reflete no dashboard aluno
- [ ] "Ver como Aluno" e "Ver como Coach" mudam o contexto e redirecionam corretamente

---

## 2. Perfil Professor (Coach)

### 2.1 Acesso e autenticação

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | Fazer login com conta **Coach** (ou Admin com "Ver como Coach") | Redirecionamento para `/coach` |
| 2 | Verificar barra lateral | Menu do Coach: Início, Entrar na aula, Tema da Semana, Agenda, Alunos, Atletas, (Meus Cursos se autorizado), Financeiro; opcional "Área aluno" se for também aluno |

### 2.2 Menu e rotas disponíveis

| Menu | Rota | Descrição |
|------|------|------------|
| Início | `/coach` | Próxima aula; link para gestão da aula |
| Entrar na aula | `/coach/aula` | Escolher aula (por data); abrir gestão de presenças; QR da aula |
| Tema da Semana | `/coach/tema-semana` | Definir tema por semana/modalidade; título; URL vídeo; navegação entre semanas |
| Agenda | `/coach/agenda` | Aulas dos próximos 28 dias (filtradas por coach) |
| Alunos | `/coach/alunos` | Lista de alunos; abrir perfil e avaliação física |
| Atletas | `/coach/atletas` | Lista de atletas; abrir perfil (performance, missões, avaliação) |
| Meus Cursos | `/coach/cursos` | (Se autorizado) Listar e criar/editar cursos; co-criação |
| Financeiro | `/coach/financeiro` | Resumo do mês: aulas dadas, receita cursos; valor por hora |
| Área aluno | `/dashboard` | (Se o coach for também aluno) Acesso ao dashboard do aluno |

### 2.3 Fluxos principais a testar

#### A) Aula e presenças

1. **Abrir aula:** Coach → Entrar na aula (ou Início → link da próxima aula). Selecionar a aula se houver várias.
2. **Lista de presenças:** Ver alunos com estado (Vou / Não vou / Pendente). Confirmar ou marcar falta. Guardar.
3. **QR Code:** Aceder ao QR da aula (link na página da aula ou menu). Escanear com telemóvel e verificar que leva ao check-in dessa aula.
4. **Perfil do aluno na aula:** Clicar num aluno para ver modal com dados (peso, altura, notas médicas, contacto) se existirem.

#### B) Tema da Semana

1. **Definir tema:** Coach → Tema da Semana. Escolher semana (navegação ← → ou "Ir para a semana atual"). Preencher modalidade, título; opcional: curso associado, URL do vídeo. Guardar.
2. **Outra semana:** Alterar semana com os botões e guardar tema para essa semana. Verificar que no dashboard do aluno (na semana correspondente) aparece o tema com link para vídeo ou curso.

#### C) Alunos e atletas

1. **Lista de alunos:** Coach → Alunos. Abrir um aluno: ver dados, plano, última avaliação física. Botão "Realizar avaliação física" ou "Nova avaliação física" deve levar à ficha.
2. **Avaliação física:** Preencher as secções da ficha (anamnese, etc.). Guardar. Verificar que nextDueAt fica 6 meses à frente e que no dashboard do aluno aparece a missão de avaliação física se aplicável.
3. **Atletas:** Coach → Atletas. Abrir atleta → Perfil (performance): radar, faixa, XP, missões (sistema + configuráveis). Registar avaliação (sliders) se a página o permitir.
4. **Performance do atleta:** Na página do atleta, secção de avaliação: preencher dimensões (ex.: Técnico, Físico). Guardar. No dashboard do aluno devem atualizar as "Metas de avaliação" e o radar.

#### D) Cursos (se autorizado)

1. **Listar cursos:** Coach → Meus Cursos. Ver cursos onde é co-criador ou criador.
2. **Criar curso:** Novo curso (nome, categoria, etc.). Guardar. Editar e adicionar módulos/unidades.
3. **Co-criação:** Em cursos criados pelo admin, o coach pode ser adicionado como co-criador no Admin; no coach deve aparecer no seu contexto conforme regras da app.

#### E) Financeiro coach

1. **Painel:** Coach → Financeiro. Ver número de aulas no mês e receita de cursos (se aplicável). Valores calculados com base em hourly_rate e lógica de pagamento a coaches.

### 2.4 Checklist de validação – Professor (Coach)

- [ ] Login como Coach redireciona para `/coach`
- [ ] Próxima aula visível e link para gestão da aula funciona
- [ ] Na página da aula: lista de alunos com presenças; confirmar/marcar falta e guardar
- [ ] QR Code da aula abre e leva ao check-in correto
- [ ] Tema da Semana: definir tema, URL vídeo, navegar entre semanas; tema aparece no dashboard do aluno na semana certa
- [ ] Alunos: abrir perfil; iniciar/editar avaliação física e guardar
- [ ] Atletas: abrir perfil e performance; registar avaliação (dimensões); radar e missões atualizam no aluno
- [ ] Se tiver "Meus Cursos": listar e criar/editar curso
- [ ] Financeiro: painel com aulas e receita do mês visível
- [ ] Se coach for aluno: link "Área aluno" leva ao dashboard

---

## 3. Perfil Aluno

### 3.1 Acesso e autenticação

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | Fazer login como **aluno** (ou Admin com "Ver como Aluno") | Redirecionamento para `/dashboard` |
| 2 | Verificar barra lateral | Início, Conquistas, Loja, Biblioteca, Eventos, Financeiro, Meus dados (Perfil) |

### 3.2 Menu e rotas disponíveis

| Menu | Rota | Descrição |
|------|------|------------|
| Início | `/dashboard` | Próxima aula, esta semana, plano, meta do mês, meta IMC, metas avaliação, conquistas, tema da semana, cursos recomendados, notificações |
| Conquistas | `/dashboard/conquistas` | Próxima conquista; grelha de conquistas gerais; todas as conquistas desbloqueadas |
| Loja | `/dashboard/loja` | Cursos à venda; eventos; comprar / inscrever-me |
| Biblioteca | `/dashboard/biblioteca` | Cursos a que tem acesso (plano ou compra); entrar no curso |
| Eventos | `/dashboard/eventos` | Eventos futuros; inscrições |
| Financeiro | `/dashboard/financeiro` | Plano atual; link Stripe (se config); últimos pagamentos |
| Meus dados | `/dashboard/perfil` | Editar nome, peso, altura, contacto, notas médicas, etc. |
| Performance | `/dashboard/performance` | (Se atleta) Faixa, XP, radar, missões, detalhe por dimensão |

### 3.3 Fluxos principais a testar

#### A) Dashboard e presença

1. **Próxima aula:** Card com modalidade, data, hora. Botões "Vou" / "Não vou". Após escolher, estado deve atualizar (e coach pode confirmar depois).
2. **Esta semana:** Lista do resto das aulas da semana com estado de presença em cada uma.
3. **Plano:** Se tiver plano atribuído, card "O teu plano" com nome e preço.
4. **Check-in:** Link "No ginásio? Escaneia o QR..." ou "abre este link no telemóvel" para a aula; em `/check-in/[lessonId]` deve conseguir marcar presença.

#### B) Meta do mês e metas extras

1. **Meta de assiduidade:** Secção "Meta do mês" com X / Y aulas e barra de progresso. Quando X ≥ Y, mensagem "Parabéns!" e "Meta atingida!" com destaque (borda verde).
2. **Meta de saúde (IMC):** Se tiver peso e altura em Meus dados, secção "Meta de saúde" com IMC atual, faixa (ex.: Peso saudável, Sobrepeso) e texto da meta (atingir/manter faixa saudável).
3. **Metas de avaliação:** Se tiver avaliações do coach, até 2 eixos (ex.: "Subir Técnico para 8") com barra de progresso.

#### C) Conquistas

1. **Página Conquistas:** Menu → Conquistas. Ver "Próxima conquista" (nome, descrição, current/target, barra). Secção "Conquistas gerais" com grelha de badges (ganhos com data; não ganhos com progresso). Secção "Todas as conquistas" com lista completa.
2. **Dashboard:** Na secção Conquistas do dashboard, link "Ver todas →" deve levar a `/dashboard/conquistas`. Lista de conquistas desbloqueadas com datas.

#### D) Tema da Semana

1. **Card no dashboard:** Após o coach definir o tema da semana (e modalidade correspondente), o aluno vê o card "Tema da Semana" com título. Se houver curso associado, link para o curso; se houver URL do vídeo, botão "Ver vídeo".

#### E) Loja e Biblioteca

1. **Loja:** Ver cursos disponíveis para compra e eventos. Clicar "Comprar" ou "Inscrever-me"; confirmar. Após "compra" (registo na escola), o curso deve aparecer na Biblioteca ou o evento na lista de inscrições.
2. **Biblioteca:** Listar cursos acessíveis. Entrar num curso: ver módulos e unidades; ver vídeo das unidades. Progresso (concluído / em progresso) conforme implementado.
3. **Cursos recomendados:** No dashboard, secção "Recomendado para ti" com cursos sugeridos (ex.: por modalidade principal); link para abrir na Biblioteca.

#### F) Financeiro e perfil

1. **Financeiro:** Ver plano atual e preço; lista de últimos pagamentos (mês, valor, status). Se Stripe estiver configurado, link para subscrever ou gerir cartão.
2. **Meus dados:** Editar nome, peso, altura, data nascimento, contacto, notas médicas. Guardar. Verificar que no dashboard a meta de IMC usa os novos dados (após refresh).

#### G) Performance (se atleta)

1. **Dashboard Performance:** Aceder a `/dashboard/performance` (link no dashboard ou perfil). Ver faixa, XP, radar (Técnico, Tático, Físico, Mental, Teórico), missões (sistema + configuráveis), feedback do coach se existir.

### 3.4 Checklist de validação – Aluno

- [ ] Login como aluno redireciona para `/dashboard`
- [ ] Próxima aula visível; "Vou" / "Não vou" atualiza o estado
- [ ] Lista "Esta semana" e histórico de presenças corretos
- [ ] Meta do mês mostra progresso e celebração quando atingida
- [ ] Se tiver peso/altura: Meta de saúde (IMC) e faixa corretos
- [ ] Se tiver avaliações: Metas de avaliação (até 2 eixos) visíveis
- [ ] Página Conquistas: próxima conquista, grelha de conquistas gerais, lista de conquistas
- [ ] Tema da Semana aparece quando definido pelo coach; links curso/vídeo funcionam
- [ ] Loja: listar cursos e eventos; comprar/inscrever e ver atualização
- [ ] Biblioteca: listar cursos acessíveis; abrir curso e ver módulos/unidades
- [ ] Financeiro: plano e últimos pagamentos visíveis
- [ ] Meus dados: editar e guardar; dados refletem no dashboard (ex.: IMC)
- [ ] Se atleta: Performance com faixa, XP, radar e missões
- [ ] Tema claro/escuro e idioma (PT/EN) funcionam no menu

---

## Resumo rápido por perfil

| Perfil   | Foco de teste principal |
|----------|--------------------------|
| **Admin** | Escolas, alunos, planos, turmas, financeiro (renovações e mensalidades), cursos, missões, configurações, experimentais, coaches |
| **Coach** | Aula (presenças, QR), Tema da Semana, alunos (perfil e avaliação física), atletas (performance e avaliação), cursos se autorizado, financeiro |
| **Aluno** | Dashboard (aula, plano, metas, conquistas, tema da semana), presença (Vou/Não vou, check-in), Conquistas, Loja, Biblioteca, Perfil, Financeiro, Performance |

---

*Documento alinhado ao estado atual da aplicação KFS. Atualizar quando forem adicionadas novas funcionalidades por perfil.*
