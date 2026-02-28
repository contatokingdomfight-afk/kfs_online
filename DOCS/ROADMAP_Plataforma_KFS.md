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
| Missões ativas (sistema + configuráveis) | Feito | Admin /admin/missoes; por modalidade e faixa; XP por conclusão |
| Sugestões de conteúdo no dashboard | Por fazer | Com base em assiduidade e avaliações (quando houver Biblioteca) |

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
| Renovação / cobrança recorrente na app | Por fazer | Hoje o financeiro regista pagamentos manualmente; automatização é futura |

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
| Editar coach (nome, especialidades) | Feito | `/admin/coaches/[id]` |

---

## 10. Admin – Financeiro

| Item | Estado | Notas |
|------|--------|--------|
| Listar pagamentos | Feito | Com filtro |
| Registar pagamento | Feito | `/admin/financeiro/novo` (aluno, valor, mês, status) |
| Ligar pagamento a plano / renovação automática | Por fazer | Opcional; hoje é registo manual |

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
| Definir “Tema da Semana” | Por fazer | Ver “Sala de Aula Invertida” abaixo |

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
| Conteúdos / Cursos (Biblioteca) | Por fazer | Tabelas e lógica para cursos, módulos, vídeos |
| Badges / Conquistas | Por fazer | Tabela e regras de atribuição |
| Metas de assiduidade | Por fazer | Configuração e progresso |
| Tema da Semana | Por fazer | Tabela ou campo em Lesson/turma + associação a conteúdo |
| Eventos (Camps, Workshops) | Por fazer | Inscrições e pagamentos/registos |

---

## 14. Funcionalidades por fazer (especificação Kingdom Digital)

Resumo das áreas descritas na [Especificação da Plataforma Kingdom Digital](./Especificacao_Plataforma_Kingdom_Digital.md) que ainda não têm implementação.

### 14.1 Dashboard de Performance ultra-personalizado (parcialmente feito)

- **Feito:** Métricas por dimensão (Técnico, Tático, Físico, Mental, Teórico); gráfico radar; faixas por cor e XP; missões (sistema + configuráveis); detalhe por componente filtrado pela modalidade principal do aluno; feedback do coach (card).
- **Por fazer:** KPIs explícitos por modalidade (BJJ quando existir); feedback que sugere conteúdos da biblioteca (quando Biblioteca existir).


### 14.2 Biblioteca de Conteúdo 360º

- Catálogo de cursos e vídeos (Técnica, Mindset, Performance).
- Upload/gestão de cursos pela escola (admin).
- Acesso por plano (conforme Plan.includes_digital_access) ou por compra avulsa.
- Página de curso com módulos e progresso do aluno (concluído / em progresso).
- Filtros por categoria, modalidade, nível.

### 14.3 Gamificação e presença (parcialmente feito)

- **Feito:** Sistema de faixas (cores) e XP; missões ativas (subir dimensão X + missões configuráveis no Admin); missão “Avaliação física”; conclusão de avaliação na aula atribui XP por targets de dimensão.
- **Por fazer:** Badges/conquistas por check-ins (5 aulas, 10 aulas, 3 semanas seguidas, por modalidade); metas de assiduidade (X aulas por mês); progresso da meta no dashboard.

### 14.4 Sala de Aula Invertida

- Coach define “Tema da Semana” (por turma/modalidade).
- Aluno vê o tema e o vídeo de teoria no app.
- Associação tema ↔ vídeo da biblioteca (ou vídeo dedicado).

### 14.5 Receita adicional (Cursos, Camps, Workshops)

- Página “Cursos e Eventos” (ou “Loja”) na plataforma.
- Listagem de cursos avulsos, Camps, Workshops com preço.
- Alunos sem acesso pelo plano podem “Comprar” ou “Inscrever-me” (eventos com data).
- Registo da compra/inscrição e integração com o módulo Financeiro.
- Desbloquear acesso ao conteúdo ou ao evento após compra/inscrição.

---

## 15. Outros (plano / melhorias futuras)

| Item | Estado | Notas |
|------|--------|--------|
| Modalidades: Jiu-Jitsu (BJJ), MMA | Por fazer | Hoje: Muay Thai, Boxing, Kickboxing |
| Biometria (mencionada no plano) | Por fazer | Métricas além de presença; depende de definição de produto |
| Notificações (email/push) | Feito | Resend: confirmação de presença (coach confirma); cron lembrete aulas (GET /api/cron/lesson-reminders). |
| Remuneração de coaches (configurável) | Por fazer | Doc dedicado; dados já existem (Lesson, Attendance) |
| Internacionalização (PT/EN) | Feito | Cookie kfs-locale; getTranslations(locale); mensagens em lib/i18n; sidebar e landing traduzidos. |
| Dark / Light mode | Feito | data-theme no html; tokens em globals.css; ThemeLocaleSwitcher no sidebar e na landing. |

---

## 16. Ordem sugerida para desenvolver o que falta

Com base na especificação e na dependência entre módulos:

1. **Biblioteca 360º** – Base para Sala Invertida e Receita adicional (cursos/vídeos).
2. **Sala de Aula Invertida** – Tema da Semana + vídeo no app (usa Biblioteca).
3. **Receita adicional** – Página de cursos/eventos com compra e inscrição (usa Biblioteca e Planos).
4. **Dashboard de Performance** – Já implementado (Perfil do atleta gamificado: faixas, XP, radar, missões, detalhe por componente). Por fazer: sugestões de conteúdo (quando houver Biblioteca).
5. **Gamificação** – Parcial: faixas/XP e missões (sistema + configuráveis). Por fazer: badges por check-ins e metas de assiduidade.

---

*Última atualização sugerida: sempre que uma tarefa for concluída, mudar o estado de “Por fazer” para “Feito” e adicionar uma linha de nota se necessário. Documentação atualizada: Perfil do atleta gamificado, avaliação física (ficha anamnese, 6 meses), Admin Missões, modelo de dados (xp, MissionTemplate, StudentPhysicalAssessment).*
