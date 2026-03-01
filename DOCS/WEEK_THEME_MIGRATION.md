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
