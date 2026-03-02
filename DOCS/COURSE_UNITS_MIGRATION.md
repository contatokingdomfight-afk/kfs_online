# Migration: Módulos e Unidades

## Estrutura

- **Curso** → **Módulos** → **Unidades**
- Cada **unidade** pode ser:
  - **Vídeo** – URL do vídeo (YouTube, etc.)
  - **Texto** – Conteúdo para leitura complementar

## O que a migration adiciona

- **CourseUnit** – Unidades dentro de um módulo (vídeo ou texto)
- **CourseUnitProgress** – Progresso do aluno por unidade
- Migração automática: módulos existentes com `video_url` passam a ter uma unidade de vídeo
- Migração de progresso: `CourseProgress` (por módulo) é copiado para `CourseUnitProgress` (por unidade)

## Como executar

1. Abra o **Supabase Dashboard** → **SQL Editor**
2. Copie o conteúdo de `prisma/migrations/add_course_units.sql`
3. Execute o script

## Admin

- Em **Admin** → **Cursos** → [editar curso]:
  - Cada módulo mostra as suas unidades
  - Adicionar unidade: escolher tipo (Vídeo ou Texto), preencher URL ou texto
  - Eliminar unidade com o botão "Eliminar"

## Aluno (Dashboard)

- Na página do curso, cada módulo lista as suas unidades
- Vídeos são reproduzidos em iframe
- Textos são exibidos para leitura
- Botão "Marcar como concluído" por unidade
