# Roadmap – Plataforma Kingdom Fight School

> Visão do que **já está feito** e do que **falta fazer** na aplicação, alinhada ao [Plano de Negócios](./Plano_de_Negócios_Kingdom_Fight_School.md) e à [Especificação da Plataforma Kingdom Digital](./Especificacao_Plataforma_Kingdom_Digital.md).  
> Atualizar este ficheiro à medida que forem concluídas novas funcionalidades.

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
| Próxima aula em destaque | Feito | Card com modalidade, data, horário |
| Lista “Esta semana” (resto das aulas) | Feito | Com estado de presença por aula |
| Marcar presença (check-in) | Feito | Botão/link por aula; link direto `/check-in/[lessonId]` |
| Histórico de presenças (passadas) | Feito | Lista com modalidade, data, horário, status (Pendente/Confirmada/Falta) |
| Mostrar plano atual no dashboard | Feito | Card “O teu plano” com nome e preço (quando atribuído) |
| Dashboard de performance (Perfil do atleta gamificado) | Feito | Faixas (cores), XP, radar, stat cards, detalhe por componente, missões |
| Gráfico radar / “Avatar” de evolução | Feito | Técnico, Tático, Físico, Mental, Teórico (Recharts) |
| Missões ativas (sistema + configuráveis) | Feito | Admin /admin/missoes; por modalidade e faixa; XP por conclusão; importar missões padrão (seed) |
| Sugestões de conteúdo no dashboard | Feito | Cursos recomendados por modalidade principal; link para biblioteca |
| Conquistas (badges) | Feito | Página /dashboard/conquistas; grelha de badges fixos; próxima conquista; link no sidebar |
| Meta do mês (assiduidade) | Feito | Configuração em Admin Configurações; barra de progresso e celebração no dashboard |
| Meta de saúde (IMC) | Feito | Card no dashboard quando há peso+altura; faixa OMS e sugestão “atingir/manter faixa saudável” |
| Metas de avaliação | Feito | Até 2 eixos do radar a melhorar (ex.: “Subir Técnico para 8”) no dashboard |

---

## 3. Check-in e presença (operacional)

| Item | Estado | Notas |
|------|--------|--------|
| Página de check-in por aula (`/check-in/[lessonId]`) | Feito | Aluno marca presença; requer login |
| QR Code da aula (coach) | Feito | `/coach/aula/qr` com QR para a aula |
| Link de check-in no dashboard do aluno | Feito | Por aula: “abre este link no telemóvel” |
| Coach confirma/ajusta presença na aula | Feito | Em `/coach/aula?lesson=...` |
| Status de presença: Pendente, Confirmada, Falta | Feito | Em Attendance.status |
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
| Tabela Plan na base de dados | Feito | name, description, price_monthly, includes_digital_access, modality_scope, is_active |
| Ligação Student.planId → Plan | Feito | Opcional |
| Listar planos | Feito | `/admin/planos` |
| Criar plano | Feito | `/admin/planos/novo` |
| Editar plano | Feito | `/admin/planos/[id]` |
| Planos iniciais (Online, Presencial I/II, FULL) | Feito | Inseridos na migration |
| Renovação / mensalidades | Feito | Admin Financeiro: “Renovações do mês” + gerar mensalidades; cron opcional para gerar no início do mês |

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
| Listar aulas (turmas) | Feito | `/admin/turmas` com “Editar” por aula |
| Criar aula | Feito | Modalidade, data, horário, coach obrigatório, capacidade, notas |
| Editar aula | Feito | `/admin/turmas/[id]` com formulário completo |
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
| Autorizar coach a criar cursos | Feito | Checkbox can_create_courses no perfil do aluno do coach |

---

## 10. Admin – Financeiro

| Item | Estado | Notas |
|------|--------|--------|
| Listar pagamentos | Feito | Com filtro |
| Registar pagamento | Feito | `/admin/financeiro/novo` (aluno, valor, mês, status); query params para pré-preencher |
| Renovação automática / mensalidades | Feito | Secção “Renovações do mês”: lista de alunos com plano sem pagamento; botão “Gerar mensalidades” (cria Payment LATE); cron GET /api/cron/generate-monthly-payments |

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
| Student | Feito | userId, status, planId |
| Athlete | Feito | studentId, level, mainCoachId, **xp** (gamificação) |
| AthleteMissionAward | Feito | XP já atribuído por target de dimensão (evita duplicar) |
| MissionTemplate | Feito | Missões configuráveis (modalidade, faixa, xpReward) |
| AthleteMissionCompletion | Feito | Missões de modelo já concluídas pelo atleta |
| StudentPhysicalAssessment | Feito | Ficha avaliação física; assessedAt, nextDueAt (6 meses), clearance, formData (JSONB) |
| StudentProfile | Feito | Dados aluno (peso, altura, nascimento, contacto, etc.) para identificação na ficha |
| Coach | Feito | userId, specialties |
| Lesson | Feito | modality, date, startTime, endTime, coachId, capacity, planningNotes |
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

- **Feito:** Métricas por dimensão (Técnico, Tático, Físico, Mental, Teórico); gráfico radar; faixas por cor e XP; missões (sistema + configuráveis por modalidade); detalhe por componente filtrado pela modalidade principal do aluno; feedback do coach (card); **KPIs explícitos por modalidade** (secção “Performance por modalidade” na página /dashboard/performance com scores por modalidade, escala 1–10; BJJ quando existir aparecerá automaticamente); **feedback que sugere conteúdos da biblioteca** (secção “Conteúdos sugeridos para ti” na mesma página, até 3 cursos por modalidade principal, junto ao feedback do coach).


### 14.2 Biblioteca de Conteúdo 360º

- Catálogo de cursos e vídeos (Técnica, Mindset, Performance). **Feito**
- Upload/gestão de cursos pela escola (admin). **Feito**
- Acesso por plano (conforme Plan.includes_digital_access) ou por compra avulsa. **Feito**
- Página de curso com módulos e progresso do aluno (concluído / em progresso). **Feito**
- Filtros por categoria, modalidade, nível. **Feito**
- Módulos por curso (múltiplos vídeos); progresso do aluno. **Feito**

### 14.3 Gamificação e presença

- **Feito:** Sistema de faixas (cores) e XP; missões ativas (subir dimensão X + missões configuráveis no Admin); missão “Avaliação física”; conclusão de avaliação na aula atribui XP por targets de dimensão; **badges/conquistas** (primeira aula, 5/10/25/50/100 aulas, 3/5 semanas seguidas, por modalidade); **meta de assiduidade** (X aulas/mês configurável, barra e celebração no dashboard); **página Conquistas** (/dashboard/conquistas) com grelha de badges e próxima conquista; **meta de saúde (IMC)** e **metas de avaliação** (melhorar eixos do radar) no dashboard; **seed de 62 missões** (Admin → Importar missões padrão); faixa mínima nas missões (ex.: Verde ou superior).
- **Por fazer (opcional):** Battle Pass por temporada; reset automático de missões mensais; recompensas reais (camiseta, desconto).

### 14.4 Sala de Aula Invertida

- **Feito:** Coach define “Tema da Semana” em /coach/tema-semana (por semana e modalidade; título, curso opcional, URL vídeo opcional); navegação entre semanas; aluno vê no dashboard (card “Tema da Semana” com link para curso e/ou “Ver vídeo”).

### 14.5 Receita adicional (Cursos, Camps, Workshops)

- **Feito:** Página Loja (/dashboard/loja) com produtos (cursos avulsos, eventos); “Comprar” / “Inscrever-me”; CoursePurchase e registo no Financeiro; desbloqueio de acesso ao conteúdo/evento.

---

## 15. Outros (plano / melhorias futuras)

| Item | Estado | Notas |
|------|--------|--------|
| Modalidades: Jiu-Jitsu (BJJ), MMA | Por fazer | Hoje: Muay Thai, Boxing, Kickboxing |
| Biometria (mencionada no plano) | Por fazer | Métricas além de presença; depende de definição de produto |
| Notificações (email/push) | Feito | Resend: confirmação de presença (coach confirma); cron lembrete aulas (GET /api/cron/lesson-reminders). |
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
6. **Próximos passos (opcional):** Battle Pass / temporadas; reset mensal de missões; PWA e app nativo (secção 17); renovação automática de planos; notificações push.

---

## 17. Aplicação móvel e distribuição (após conclusão das atualizações)

> **Prioridade:** Desenvolver apenas depois de concluídas todas as funcionalidades e atualizações previstas nas secções anteriores (Biblioteca, Sala Invertida, Receita adicional, Gamificação completa, etc.).

| Item | Estado | Notas |
|------|--------|--------|
| PWA (Progressive Web App) | Por fazer | Manifest, Service Worker, meta tags; app instalável na tela inicial do telemóvel |
| Capacitor (Android + iOS) | Por fazer | Embrulhar o web app em container nativo; publicar na Play Store e App Store |
| Testes em dispositivos reais | Por fazer | Validar UX e performance em Android e iOS |

**Ordem sugerida:** (1) PWA → (2) Capacitor → (3) Publicação nas lojas.

---

*Última atualização: Dashboard de Performance – KPIs por modalidade e sugestões de biblioteca junto ao feedback do coach (secções na página Perfil do Atleta). Próximos passos opcionais: Battle Pass, PWA/Capacitor, renovação automática.*
