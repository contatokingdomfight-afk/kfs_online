# Tema da Semana (Sala de Aula Invertida) – Migration

Para ativar o Tema da Semana, execute a migration no Supabase:

1. Abra o **Supabase Dashboard** → **SQL Editor**
2. Copie o conteúdo de `prisma/migrations/add_week_theme.sql`
3. Execute o script

## O que a migration adiciona

- **WeekTheme** – Tabela para o coach definir o tema da semana por modalidade
  - `modality` – MUAY_THAI, BOXING, KICKBOXING
  - `week_start` – Segunda-feira da semana (formato YYYY-MM-DD)
  - `title` – Título do tema
  - `course_id` – (opcional) Curso da biblioteca associado ao tema

## Funcionalidades

- **Coach:** Em `/coach/tema-semana` define o tema por modalidade e pode associar um curso/vídeo da biblioteca
- **Aluno:** No dashboard vê o tema da semana e o botão "Ver vídeo da teoria" quando há curso associado

## Migration 2: detalhe por dia (`add_week_theme_days.sql`)

Adiciona a tabela **WeekThemeDay** (aditiva, não muda `WeekTheme`):

1. Abra o **Supabase Dashboard** → **SQL Editor**
2. Copie o conteúdo de `prisma/migrations/add_week_theme_days.sql`
3. Execute o script

- `modality` + `week_start` + `weekday` (Segunda=1 … Domingo=7, igual a `Lesson.weekday`) — PK
- `topic` — texto curto do dia; só existe linha para dias preenchidos
- FK para `WeekTheme(modality, week_start)` com `ON DELETE CASCADE`

Funcionalidades novas:

- **Coach:** grid de 7 dias no editor de `/coach/tema-semana`, e vista mensal em
  `/coach/tema-semana/mensal` (filtro de mês + modalidade)
- **Admin:** mesma vista mensal em `/admin/tema-semana` (primeira página deste
  feature no backoffice)
- **Aluno:** lista compacta dos dias da semana (com "Hoje" destacado) na aba
  "Tema da Semana" do card "O que há de novo"

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — abril 2026.*
