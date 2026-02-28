# Biblioteca 360º – Migration

Para ativar a Biblioteca 360º completa (módulos, progresso, nível), execute a migration no Supabase:

1. Abra o **Supabase Dashboard** → **SQL Editor**
2. Copie o conteúdo de `prisma/migrations/add_biblioteca_360.sql`
3. Execute o script

## O que a migration adiciona

- **Course.level** – Nível do curso (Iniciante, Intermediário, Avançado)
- **CourseModule** – Módulos/aulas dentro de um curso (múltiplos vídeos)
- **CourseProgress** – Progresso do aluno (módulos concluídos)

## Funcionalidades

- **Admin:** Cursos com nível; adicionar/eliminar módulos por curso
- **Biblioteca:** Filtros por categoria, modalidade e nível
- **Página do curso:** Lista de módulos com vídeos; botão "Marcar como concluído"; progresso X/Y módulos

## Retrocompatibilidade

Cursos sem módulos continuam a funcionar com o vídeo principal (`video_url`).
