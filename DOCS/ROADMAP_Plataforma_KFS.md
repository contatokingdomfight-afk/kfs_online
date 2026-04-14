# Roadmap – Plataforma Kingdom Fight School

> Visão do que **já está feito** e do que **falta fazer** na aplicação, alinhada ao [Plano de Negócios](./Plano_de_Negócios_Kingdom_Fight_School.md) e à [Especificação da Plataforma Kingdom Digital](./Especificacao_Plataforma_Kingdom_Digital.md).  
> Atualizar este ficheiro à medida que forem concluídas novas funcionalidades. **Revisão recente:** 14 abril 2026 (emails transacionais, doc Resend, tabela planos §5, §15 notificações).

---

## Legenda

- **Feito** – Implementado e em uso.
- **Por fazer** – Previsto na especificação/plano; ainda não desenvolvido.

---

## 1. Autenticação e perfis

| Item | Estado | Notas |
|------|--------|--------|
| Login / sign-in (Clerk ou Supabase Auth) | Feito | Redirect com `?next=` para check-in quando aplicável |
| Sincronização User (auth → tabela User) | Feito | `syncUser` cria/atualiza User e Student quando role ALUNO |
| Roles: ALUNO, COACH, ADMIN | Feito | Definidos em User.role |
| Perfil Student (aluno) | Feito | Criado ao fazer login como aluno |
| Perfil Coach | Feito | Admin convida; coach acede à área coach |
| Perfil Admin | Feito | Acesso às rotas /admin |

---

## 2. Aluno – Dashboard e presença

| Item | Estado | Notas |
|------|--------|--------|
| Dashboard do aluno | Feito | Próximas aulas da semana, marcar presença, histórico |
| Próxima aula em destaque | Feito | **Carrossel** «Sua próxima aula»: todas as aulas elegíveis (plano: várias modalidades/dia); sem plano: aulas livres nesta secção |
| Secção «Aulas livres» na semana | Feito | **Carrossel** «Nesta semana — aulas livres» quando há plano e aulas livres extra (após Painel do Guerreiro) |
| Lista “Esta semana” (resto das aulas) | Feito | Com estado de presença por aula |
| Marcar presença (check-in) | Feito | Botão/link por aula; link direto `/check-in/[lessonId]` |
| Histórico de presenças (passadas) | Feito | Lista com modalidade, data, horário, status (Pendente/Confirmada/Falta) |
| Mostrar plano atual no dashboard | Feito | Card “O teu plano” com nome e preço (quando atribuído) |
| Dashboard de performance (Perfil do atleta gamificado) | Feito | Faixas (cores), XP, radar, stat cards, detalhe por componente, missões |
| Gráfico radar / “Avatar” de evolução | Feito | Técnico, Tático, Físico, Mental, Teórico — **SVG nativo** (`components/fighter/RadarStats.tsx`; Recharts removido para reduzir bundle) |
| Missões ativas (sistema + configuráveis) | Feito | Admin /admin/missoes; por modalidade e faixa; XP por conclusão; importar missões padrão (seed) |
| Sugestões de conteúdo no dashboard | Feito | Cursos recomendados por modalidade principal; link para biblioteca |
| Conquistas (badges) | Feito | Página /dashboard/conquistas; grelha de badges fixos; próxima conquista; link no sidebar |
| Ranking por XP (escola) | Feito (v1) | `/dashboard/rank`; leaderboard na mesma escola; RPC `get_leaderboard_my_school`; com plano + tracking performance |
| Meta do mês (assiduidade) | Feito | Configuração em Admin Configurações; barra de progresso e celebração no dashboard |
| Meta de saúde (IMC) | Feito | Card no dashboard quando há peso+altura; faixa OMS e sugestão “atingir/manter faixa saudável” |
| Metas de avaliação | Feito | Até 2 eixos do radar a melhorar (ex.: “Subir Técnico para 8”) no dashboard |
| **Aulas livres (open class)** | Feito | `Lesson.isOpenClass`; alunos **sem plano** ou com plano **sem check-in** veem **apenas** aulas livres (carrossel «Sua próxima aula»); com plano, secção extra de carrossel para livres; lógica em `lib/dashboard-lesson-filter.ts` |
| Critérios (resultados): ação «Ver como melhorar» com conteúdo | Por fazer | Ligação futura a biblioteca/dicas por critério; placeholder retirado da UI |

---

## 2b. Admin – Critérios de avaliação (pilares por modalidade)

| Item | Estado | Notas |
|------|--------|--------|
| Dimensões gerais (Técnico, Tático, Físico, Mental, Teórico) + subcategorias (`EvaluationComponent`) | Feito | Admin **Avaliação** (`app/admin/avaliacao/`): árvore por dimensão e **várias subcategorias** por dimensão |
| Critérios com descrição por modalidade | Feito | `EvaluationCriterion`; avaliação do coach e radar alinhados ao que está na BD |
| **Replicar o mesmo critério em várias modalidades** | Feito | UI «Adicionar também em» + `actions.ts` (`extraComponentIds`) |
| Dados legacy inconsistentes (ex.: Muay Thai antigo) | Feito | Migração `20260410120000_remove_legacy_evaluation_components.sql` (limpeza de componentes/critérios órfãos nas modalidades listadas) |
| Refrescar critérios após alteração no admin | Feito | Sem `unstable_cache` em `lib/load-evaluation-config.ts` (dados sempre actuais em rotas dinâmicas) |

---

## 3. Check-in e presença (operacional)

| Item | Estado | Notas |
|------|--------|--------|
| Página de check-in por aula (`/check-in/[lessonId]`) | Feito | Aluno marca presença; requer login |
| QR Code da aula (coach) | Feito | `/coach/aula/qr` com QR para a aula |
| Link de check-in no dashboard do aluno | Feito | Por aula: “abre este link no telemóvel” |
| Coach confirma/ajusta presença na aula | Feito | Em `/coach/aula?lesson=...` |
| **Email ao aluno quando a presença é confirmada** | Feito | Resend: `sendCheckInConfirmation` em `lib/notifications/email.ts` — layout HTML com marca + parte texto; requer `RESEND_API_KEY` (e `RESEND_FROM_EMAIL` em produção) |
| Status de presença: Pendente, Confirmada, Falta | Feito | Em Attendance.status |
| **Check-in / intenção (RSVP) em aula livre sem plano** | Feito | `lib/perform-check-in.ts` e `setAttendanceIntention` em `app/dashboard/actions.ts` dispensam `hasCheckIn` quando `Lesson.isOpenClass` |
| Admin: lista de presenças (próximas 2 semanas) | Feito | `/admin/presenca` com link para aula do coach |

---

## 4. Admin – Alunos

| Item | Estado | Notas |
|------|--------|--------|
| Listar alunos | Feito | Com filtro por status (Ativo/Inativo/Experimental) |
| Convidar aluno (novo) | Feito | Email; cria User + Student |
| Editar aluno (nome, status) | Feito | Em `/admin/alunos/[id]` |
| Atribuir plano ao aluno | Feito | Select de planos na edição do aluno |
| Atalho «Acesso total» (plataforma + ginásio) | Feito | Botão na edição do aluno; atribui plano com digital + todas as modalidades |

---

## 5. Admin – Planos

| Item | Estado | Notas |
|------|--------|--------|
| Tabela Plan na base de dados | Feito | Colunas PostgREST/Prisma em **camelCase** (`priceMonthly`, `includesDigitalAccess`, `modalityScope`, `isActive`, `stripePriceId`, etc.); ver `memory.md` §3.15 |
| Ligação Student.planId → Plan | Feito | Opcional |
| Listar planos | Feito | `/admin/planos` — leitura com cliente de **sessão**; planos partilhados em `default-school-001` também em `/escolher-plano` |
| Criar plano | Feito | `/admin/planos/novo` |
| Editar plano | Feito | `/admin/planos/[id]` |
| Planos iniciais (Online, Presencial I/II, FULL) | Feito | Inseridos na migration |
| Renovação / mensalidades | Feito | Admin Financeiro: “Renovações do mês” + gerar mensalidades (**force** ignora calendário); cron diário em `/api/cron/payment-suspension` (mês anterior + corrente, Lisboa). Ver **DOCS/PAGAMENTOS_MENSALIDADES_CRON.md** |

---

## 6. Admin – Atletas

| Item | Estado | Notas |
|------|--------|--------|
| Listar atletas (com coach) | Feito | `/admin/atletas` |
| Criar atleta a partir de aluno | Feito | `/admin/atletas/novo`: escolhe aluno, coach, nível |

---

## 6b. Admin – Missões (gamificação)

| Item | Estado | Notas |
|------|--------|--------|
| Listar missões configuráveis | Feito | `/admin/missoes` |
| Criar missão (nome, descrição, modalidade, faixa, XP, ordem) | Feito | Formulário em /admin/missoes |
| Eliminar missão | Feito | Com confirmação |
| Importar missões padrão (seed) | Feito | Botão “Importar missões padrão”; 62 missões do DOCS/MISSOES.md; evita duplicados por nome |
| Faixa mínima nas missões | Feito | beltIndex = faixa mínima (ex.: “Verde ou superior” mostra a partir de Verde) |

---

## 7. Admin – Turmas / Aulas

| Item | Estado | Notas |
|------|--------|--------|
| Listar aulas (turmas) | Feito | `/admin/turmas`: vista **por modalidade** e **por semana** (grade seg–dom; navegação entre semanas) |
| Criar aula | Feito | Modalidade, data ou dia da semana (recorrente), horário, coach, capacidade; modo one-off / recorrente |
| Editar aula | Feito | `/admin/turmas/[id]` com formulário completo |
| **Aula livre** (`isOpenClass`) | Feito | Qualquer aluno da escola pode participar (incl. sem plano); migração SQL `20260326140000_lesson_open_class.sql` |
| Cancelar (apagar) aula | Feito | Botão com confirmação; redireciona para lista |

---

## 8. Admin – Experimentais

| Item | Estado | Notas |
|------|--------|--------|
| Listar pedidos de aula experimental | Feito | Filtros: Todos / Pendentes / Convertidos |
| Registar novo experimental | Feito | `/admin/experimentais/novo` (modalidade, data, aula opcional) |
| Converter experimental em aluno | Feito | Convite por email + criação User + Student + marca convertedToStudent |

---

## 9. Admin – Coaches

| Item | Estado | Notas |
|------|--------|--------|
| Listar coaches | Feito | `/admin/coaches` |
| Convidar coach (novo) | Feito | `/admin/coaches/novo` |
| Editar coach (nome, especialidades, valor/hora) | Feito | `/admin/coaches/[id]`; hourly_rate para pagamento por aulas |
| Coach em várias escolas (N:N) | Feito | Tabela `CoachSchool`; UI `CoachSchoolMultiSelect` (pesquisa + chips); primeira escola = principal em `createCoach` |
| Autorizar coach a criar cursos | Feito | Checkbox can_create_courses no perfil do aluno do coach |
| UX escolas / coaches | Feito | Modais de carregamento em criar escola e guardar; `loading.tsx` na ficha do coach |

---

## 10. Admin – Financeiro

| Item | Estado | Notas |
|------|--------|--------|
| Listar pagamentos | Feito | Com filtro |
| Registar pagamento | Feito | `/admin/financeiro/novo` (aluno, valor, mês, status); query params para pré-preencher |
| Renovação automática / mensalidades | Feito | Lista sem **PAID** no mês; “Gerar mensalidades” cria **LATE** (admin com **force**). Automático: após **5.º dia útil** (Lisboa) sem PAID → `LATE`; prazo até **fim do dia 10** (Lisboa); depois **suspensão** (`planId` null, `suspendedPlanId`). Cron: **`GET /api/cron/payment-suspension`** (também gera LATE para mês anterior + corrente). Opcional: **`/api/cron/generate-monthly-payments`**. Documentação: **DOCS/PAGAMENTOS_MENSALIDADES_CRON.md** |
| Atraso / bloqueio por pagamento (online + presencial) | Feito | `lib/lisbon-payment-dates.ts`, `lib/payment-grace.ts`, `lib/renewals.ts`; notificações in-app |

---

## 11. Coach – Área do professor

| Item | Estado | Notas |
|------|--------|--------|
| Home coach (próxima aula) | Feito | Próxima aula real com link para gestão da aula |
| Agenda (aulas dos próximos 28 dias) | Feito | Filtrada por coach quando logado como coach |
| Lista de atletas | Feito | Link para perfil do atleta |
| Perfil do atleta | Feito | Nível, faixa, XP, comentários; link para avaliação física do aluno |
| Perfil do aluno (coach) | Feito | Dados, plano, última avaliação física; botão Realizar/Nova avaliação física |
| Avaliação física (ficha anamnese) | Feito | /coach/alunos/[id]/avaliacao-fisica; 10 secções; renovação 6 meses; missão no dashboard aluno |
| Página da aula (presenças, confirmação) | Feito | `/coach/aula?lesson=...` |
| Página QR da aula | Feito | `/coach/aula/qr` |
| Definir “Tema da Semana” | Feito | /coach/tema-semana; por semana e modalidade; URL vídeo opcional; navegação entre semanas |

---

## 12. Público e conversão

| Item | Estado | Notas |
|------|--------|--------|
| Landing page | Feito | Página inicial pública |
| Página “Aula experimental” | Feito | `/aula-experimental`: formulário (nome, contacto, modalidade, data, aula opcional) |
| Página de sucesso (aula experimental) | Feito | `?sucesso=1` |
| Link na landing para aula experimental | Feito | “Quero fazer uma aula experimental” |

---

## 13. Modelo de dados (BD)

| Entidade / Campo | Estado | Notas |
|------------------|--------|--------|
| User | Feito | authUserId, email, name, role |
| Student | Feito | userId, status, planId, schoolId, stripeSubscriptionId; **pagamento:** paymentGraceEndsAt, paymentGraceReferenceMonth, paymentSuspendedAt, suspendedPlanId (grace até dia 10 Lisboa; suspensão após prazo) |
| Athlete | Feito | studentId, level, mainCoachId, **xp** (gamificação) |
| AthleteMissionAward | Feito | XP já atribuído por target de dimensão (evita duplicar) |
| MissionTemplate | Feito | Missões configuráveis (modalidade, faixa, xpReward) |
| AthleteMissionCompletion | Feito | Missões de modelo já concluídas pelo atleta |
| StudentPhysicalAssessment | Feito | Ficha avaliação física; assessedAt, nextDueAt (6 meses), clearance, formData (JSONB) |
| StudentProfile | Feito | Dados aluno (peso, altura, nascimento, contacto, etc.) para identificação na ficha |
| Coach | Feito | userId, specialties |
| Lesson | Feito | modality, date, startTime, endTime, coachId, capacity, planningNotes; **isOpenClass** (aula livre); recorrente / one-off conforme migrações |
| Attendance | Feito | lessonId, studentId, status, isExperimental |
| TrialClass | Feito | name, contact, modality, lessonDate, lessonId, convertedToStudent |
| Comment | Feito | authorCoachId, targetType, targetId, content, visibility |
| Payment | Feito | studentId, amount, status, referenceMonth |
| Plan | Feito | name, description, price_monthly, includes_digital_access, modality_scope, is_active |
| Conteúdos / Cursos (Biblioteca) | Feito | Course, CourseModule, CourseUnit; progresso do aluno; loja e compras |
| Badges / Conquistas | Feito | StudentBadge; lib/gamification (badges fixos + por modalidade); página Conquistas |
| Metas de assiduidade | Feito | AttendanceGoal (meta global mensal); configuração em Admin Configurações; progresso no dashboard |
| Tema da Semana | Feito | WeekTheme (week_start, modality, title, course_id, video_url); coach define; aluno vê no dashboard |
| Eventos (Camps, Workshops) | Feito | Loja com produtos tipo EVENT; inscrição e pagamento; Admin vê em Financeiro |

---

## 14. Funcionalidades por fazer (especificação Kingdom Digital)

Resumo das áreas descritas na [Especificação da Plataforma Kingdom Digital](./Especificacao_Plataforma_Kingdom_Digital.md) que ainda não têm implementação.

### 14.1 Dashboard de Performance ultra-personalizado

- **Feito:** Métricas por dimensão (Técnico, Tático, Físico, Mental, Teórico); gráfico radar; faixas por cor e XP; missões (sistema + configuráveis por modalidade); detalhe por componente filtrado pela modalidade principal do aluno; feedback do coach (card); **KPIs explícitos por modalidade** (secção “Performance por modalidade” em `/dashboard/performance`, escala 1–10; **BJJ/MMA** entram no mesmo ecrã quando existirem **critérios de avaliação** configurados para essas modalidades — ver §15); **feedback que sugere conteúdos da biblioteca** (secção “Conteúdos sugeridos para ti”, até 3 cursos por modalidade principal); **dados biométricos agregados** a partir do check-in pré-treino (`PreLessonWellness`, secção no perfil de performance — ver `memory.md` §3.14).


### 14.2 Biblioteca de Conteúdo 360º

- Catálogo de cursos e vídeos (Técnica, Mindset, Performance). **Feito**
- Upload/gestão de cursos pela escola (admin). **Feito**
- Acesso por plano (conforme Plan.includes_digital_access) ou por compra avulsa. **Feito**
- Página de curso com módulos e progresso do aluno (concluído / em progresso). **Feito**
- Filtros por categoria, modalidade, nível. **Feito**
- Módulos por curso (múltiplos vídeos); progresso do aluno. **Feito**

### 14.3 Gamificação e presença

- **Feito:** Sistema de faixas (cores) e XP; missões ativas (subir dimensão X + missões configuráveis no Admin); missão “Avaliação física”; conclusão de avaliação na aula atribui XP por targets de dimensão; **badges/conquistas** (primeira aula, 5/10/25/50/100 aulas, 3/5 semanas seguidas, por modalidade); **meta de assiduidade** (X aulas/mês configurável, barra e celebração no dashboard); **página Conquistas** (/dashboard/conquistas) com grelha de badges e próxima conquista; **meta de saúde (IMC)** e **metas de avaliação** (melhorar eixos do radar) no dashboard; **seed de 62 missões** (Admin → Importar missões padrão); faixa mínima nas missões (ex.: Verde ou superior).
- **Feito (v1):** Página **Rank** (`/dashboard/rank`): leaderboard por **XP** (RPC `get_leaderboard_filtered`); **filtros:** escola, modalidade principal, faixa etária (data de nascimento); alunos ATIVOS com `Athlete`.
- **Por fazer:** Filtro por **período** (ex. últimos 30 dias); rankeamento por **evolução** nas dimensões além do XP acumulado; regras e anti-abuso adicionais em produto.
- **Por fazer (opcional):** Battle Pass por temporada; reset automático de missões mensais; recompensas reais (camiseta, desconto).

### 14.4 Sala de Aula Invertida

- **Feito:** Coach define “Tema da Semana” em /coach/tema-semana (por semana e modalidade; título, curso opcional, URL vídeo opcional); navegação entre semanas; aluno vê no dashboard (card “Tema da Semana” com link para curso e/ou “Ver vídeo”).

### 14.5 Receita adicional (Cursos, Camps, Workshops)

- **Feito:** Página Loja (/dashboard/loja) com produtos (cursos avulsos, eventos); “Comprar” / “Inscrever-me”; CoursePurchase e registo no Financeiro; desbloqueio de acesso ao conteúdo/evento.

### 14.6 Comunidade – Tribo (feed social)

- **Por fazer:** Página **Tribo** onde membros da comunidade podem **publicar fotos** e **vídeos curtos**; **comentar** e **curtir** publicações; **partilhar** no **Instagram, Facebook**, etc. (links profundos, Open Graph, ou SDKs conforme plataforma). Implica: modelo de publicações e media na BD, armazenamento (ex. Supabase Storage), moderação (denúncias, regras de conteúdo), permissões por role e RGPD.

---

## 15. Outros (plano / melhorias futuras)

| Item | Estado | Notas |
|------|--------|--------|
| **Rankeamento de alunos** (evolução + acúmulo de pontos) | Parcial | **v1:** `/dashboard/rank` (XP; filtros escola, modalidade, faixa etária). Falta: período, dimensões; ver §14.3 |
| **Página Tribo** (feed: fotos, vídeos curtos, comentários, curtidas, partilha em redes) | Por fazer | Comunidade; ver §14.6 |
| **Modalidades oficiais** (Muay Thai, Boxing, Kickboxing, BJJ, MMA, …) | Feito | Cadastro em **Admin → Modalidades** (`ModalityRef`); aulas, planos e filtro por modalidade usam estes códigos. |
| **Critérios de avaliação** (pilares **Técnico, Tático, Físico, Mental, Teórico**) por modalidade | Por fazer | A plataforma já tem o modelo (`EvaluationComponent` / `EvaluationCriterion`, Admin **Avaliação**). **Próximo passo operacional:** completar critérios para cada modalidade que ainda não os tenha (em especial **BJJ** e **MMA**), alinhados à metodologia KFS. |
| Biometria (mencionada no plano) | Parcial | **v1 (abril 2026):** autorrelato no check-in + agregados no perfil de performance (sono, hidratação %, stress, fadiga, zonas GREEN/YELLOW/RED); hub `/dashboard/bem-estar`, RPE, dores, benchmarks, peso. **Por fazer:** integração com dispositivos / métricas além do autorrelato; definição de produto se necessário |
| Notificações (email / cron) | Feito | **Resend:** confirmação de presença (`sendCheckInConfirmation`) e **lembrete do dia seguinte** (`sendLessonReminder`) — HTML com cabeçalho de marca + `text` alternativo (`lib/notifications/email.ts`). **Cron Vercel:** `GET /api/cron/lesson-reminders` (+ `CRON_SECRET`). **Auth (convite, reset password, etc.):** SMTP Resend no Supabase + templates em **Authentication → Email Templates** — ver **`DOCS/CONFIGURAR_RESEND.md`**. |
| Notificações **push** (browser) | Por fazer | Além de email/cron; ver §14.3 / §16 |
| Remuneração de coaches (configurável) | Feito | Coach.hourly_rate; /admin/financeiro/coaches (resumo mensal); /coach/financeiro (painel do coach) |
| Internacionalização (PT/EN) | Feito | Cookie kfs-locale; getTranslations(locale); mensagens em lib/i18n; sidebar e landing traduzidos. |
| Dark / Light mode | Feito | data-theme no html; tokens em globals.css; ThemeLocaleSwitcher no sidebar e na landing. |

---

## 16. Ordem sugerida para desenvolver o que falta

Com base na especificação e na dependência entre módulos:

1. **Biblioteca 360º** – Feito.
2. **Sala de Aula Invertida** – Feito (Tema da Semana + vídeo no dashboard).
3. **Receita adicional (Loja)** – Feito.
4. **Dashboard de Performance** – Feito (inclui sugestões de cursos recomendados).
5. **Gamificação** – Feito (badges, conquistas, meta assiduidade, meta IMC, metas avaliação, seed de missões).
6. **Próximos passos (opcional):** **Rankeamento** — extensões (modalidade, período; §14.3); **Tribo** / feed social (§14.6); Battle Pass / temporadas; reset mensal de missões; **Capacitor** / lojas (secção 17; experiência **PWA na web** já coberta — **`DOCS/PWA.md`**); notificações **push** Web (além de email/cron Resend); melhorias pontuais em mensalidades (relatórios, alertas admin).
7. **Performance (web):** iterações em **`DOCS/OTIMIZACOES_SPEED_INSIGHTS.md`** e linha «Performance web» na tabela do aluno (§2); revalidar com Lighthouse após deploy; chunk `1255-*` = runtime Next.js (não há «remoção» de código de app).

---

## 17. Aplicação móvel e distribuição (após conclusão das atualizações)

> **Prioridade:** Capacitor e lojas **depois** de estabilizar o produto web; a camada **PWA** já está utilizável no browser (instalar / atalho).

| Item | Estado | Notas |
|------|--------|--------|
| PWA (Progressive Web App) | Feito | Manifest (`app/manifest.ts`), ícones `public/icons/` (`npm run generate:pwa-icons`), SW (`public/sw.js`), metadados Apple; **`PwaInstallProvider`** + aviso inicial (mobile) + **`SidebarPwaInstall`** no menu (rodapé fixo); **Chrome:** `beforeinstallprompt`; **Safari / sem API:** mesmo CTA com **modal** de passos (`lib/pwa-install-ui.ts`); registo opcional `appinstalled` → `kfs-pwa-appinstalled-at`; ajustes overflow mobile no shell. Ver **`DOCS/PWA.md`**. |
| Capacitor (Android + iOS) | Por fazer | Embrulhar o web app em container nativo; publicar na Play Store e App Store |
| Testes em dispositivos reais | Por fazer | Validar UX e performance em Android e iOS (PWA + futuro Capacitor) |

**Ordem sugerida (distribuição):** (1) ~~PWA na web~~ ✓ → (2) **Capacitor** (quando houver decisão de produto) → (3) **Publicação nas lojas** + testes em dispositivos reais.

### Resumo — o que ainda falta fazer (prioridade de produto)

| Área | O quê | Onde no doc |
|------|--------|-------------|
| Comunidade | **Tribo** — feed (fotos/vídeos, comentários, curtidas, partilhas) | §14.6, §15 |
| Gamificação | Rank **v2** (período, evolução nas dimensões); opcional Battle Pass / temporadas | §14.3, §15 |
| Aluno / performance | «Ver como melhorar» nos critérios → **ligação a conteúdos** da biblioteca | §2 (tabela aluno), §14.1 |
| Avaliação | **Critérios dos cinco pilares** por modalidade (foco **BJJ / MMA** onde faltar) | §15 |
| Dados / produto | **Biometria** — extensões (dispositivos, métricas além do autorrelato) | §15 |
| Mobile nativo | **Capacitor** + **Play Store / App Store**; testes em **dispositivos reais** | §17 |
| Notificações | **Push Web** (além de email Resend + crons) | §15, §16 |
| Qualidade | **E2E** (ex.: Playwright), relatórios/alertas admin em financeiro (melhorias pontuais) | rodapé, §16 |
| Performance | Re-Lighthouse em `/dashboard` e `/dashboard/performance` em produção; opcional `ANALYZE=true npm run build` (bundle analyzer em `next.config.mjs`) | §2, §16 |

*Itens já cobertos na web:* PWA instalável, i18n PT/EN, dark/light, notificações in-app, **emails transacionais Resend** (presença confirmada + lembretes de aula com layout de marca; Auth via SMTP Supabase — §3 e §15), crons em §18; otimizações recentes de bundle/RSC na home do aluno e no perfil de performance (§2, §2b).

---

## 18. Stack, deploy e segurança (atual)

| Item | Estado | Notas |
|------|--------|--------|
| Next.js 15 (App Router) | Feito | Ex.: 15.5.x; `npm run build` + ESLint |
| Node 20 (engines) | Feito | Alinhar Vercel e desenvolvimento local |
| `npm audit` | Feito | Manter 0 vulnerabilidades conhecidas ao atualizar dependências |
| Crons Vercel | Feito | `vercel.json`: lembretes de aulas + **payment-suspension** (LATE + suspensão); `CRON_SECRET` obrigatório para chamadas não-Vercel |
| Testes unitários (Vitest) | Feito | `npm test`; exemplo: `lib/dashboard-lesson-filter.test.ts` (filtro de aulas no dashboard) |
| Seed de contas de teste (local/staging) | Feito | `npm run seed:test-users` + `TEST_SEED_PASSWORD` + service role; emails fixos em **DOCS/CONTAS_TESTE.md** |
| Bundle analyzer (dev) | Feito (opcional) | `@next/bundle-analyzer`; activar com `ANALYZE=true npm run build`; relatório em `.next/analyze/client.html` |

---

*Última atualização (14 abr. 2026): **Emails:** `lib/notifications/email.ts` — HTML de marca para **confirmação de presença** e **lembretes de aula**; doc operacional **`DOCS/CONFIGURAR_RESEND.md`** (SMTP, esqueci-me da senha, spam/DMARC, aparência §8). **Auth:** `getPasswordResetSiteUrl` em forgot-password. **Planos / RLS / admin:** colunas camelCase, leitura de planos com sessão, `escolher-plano` + `default-school-001` — `memory.md` §3.15. **Já documentado antes (abril 2026):** critérios admin §2b; performance RSC/radar; bem-estar §3.14 em `memory.md`; `ModalityRef`. **Próximo foco de produto (lista §309–321):** **Tribo**; Rank v2; «Ver como melhorar» → biblioteca; critérios **BJJ/MMA** na BD; biometria além do autorrelato; Capacitor + lojas; push Web; E2E; Lighthouse.*

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — abril 2026.*
