# Notificações in-app e eventos

> **Última revisão:** maio 2026. Complementa [`memory.md`](memory.md) (secções *Eventos* e *Notificações in-app*).  
> Tabela Supabase: **`Notification`** (campos relevantes: `studentId` **ou** `coachUserId`, `title`, `body`, `href`, `read_at`, `type`).

## Rotas e UI

| Perfil | Central | Sino no header |
|--------|---------|----------------|
| Aluno | `/dashboard/notificacoes` | — (acesso pelo menu / links internos) |
| Coach | `/coach/notificacoes` | `CoachNotificationBell` em layout coach |
| Admin | `/admin/notificacoes` | `CoachNotificationBell` em `app/admin/layout.tsx` (mesmo componente; `href` conforme `role`) |

- Menu lateral admin: **Central de notificações** → `/admin/notificacoes` (`lib/admin-sidebar-links.ts`).
- **Permissões granulares:** `lib/permissions/paths.ts` — `/admin/notificacoes` mapeado a `admin:sistema:read` / `write` (como outras áreas de sistema).
- Utilizador **sem** registo `Student` que abre `/dashboard/notificacoes`: redireccionamento para a central do coach ou admin, ou `/dashboard` (`app/dashboard/notificacoes/page.tsx`).

## Notificações ligadas a **eventos**

| Momento | Destinatário | Título (resumo) | Origem no código |
|---------|--------------|-----------------|-------------------|
| Aluno submete inscrição (estado `PENDING`) | Aluno | Pedido de inscrição em evento | `createInAppNotification` em `app/dashboard/eventos/actions.ts` (`registerForEvent`) |
| Idem | Cada `User` com `role === ADMIN` | Nova inscrição em evento | `notifyAllAdminsOfEventRegistrationPending` em `lib/notifications/notify-admins.ts` → `createCoachInAppNotification` com `coachUserId = admin.id` |
| Admin altera inscrição para **CONFIRMED** | Aluno | Inscrição confirmada | `createInAppNotification` em `app/admin/eventos/actions.ts` (`setRegistrationStatus`) |

**Não implementado neste fluxo:** notificação aos admins quando uma inscrição é apenas **confirmada** (só o aluno é avisado).

## Eventos — UI aluno (referência)

- **`/dashboard/eventos`:** lista por dia, calendário, inscrição; filtro **Inscritos e ativos** em `EventosBoard.tsx`.
- **Home `/dashboard`:** secção **Próximos eventos** (`DashboardUpcomingEventsStrip.tsx`) — com plano, antes de **Explorar** (via `upcomingEventsSlot` em `DashboardBelowFold`); sem plano, antes do `Suspense` do below-fold.

## Acções do utilizador

- **Marcar lida / marcar todas:** `app/dashboard/notification-actions.ts` — revalida as rotas do dashboard e das centrais coach/admin conforme o papel.

---

*Código de notificações genéricas (insert): `lib/notifications/in-app.ts`.*
