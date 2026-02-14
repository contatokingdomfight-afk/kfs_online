# Kingdom Fight School – KFS System

Plataforma de gestão e ensino da Kingdom Fight School (MVP). Mobile First.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + design tokens (DOCS)
- **Clerk** – autenticação
- **Prisma** + PostgreSQL (Supabase ou Neon)
- **Vercel** – deploy

## Começar

1. **Dependências**
   ```bash
   npm install
   ```

2. **Variáveis de ambiente**
   - Copiar `.env.example` para `.env`
   - Preencher chaves do [Clerk](https://clerk.com) e `DATABASE_URL` (PostgreSQL)

3. **Base de dados**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Desenvolvimento**
   ```bash
   npm run dev
   ```
   Abrir [http://localhost:3000](http://localhost:3000).

## Estrutura

- `app/` – rotas e layouts (Next.js App Router)
- `components/` – UI reutilizável
- `lib/` – Prisma, utils, i18n
- `locales/` – traduções PT/EN
- `prisma/` – schema e migrações
- `DOCS/` – documentação do produto

## Documentação

Ver pasta **DOCS/** para visão, modelo de dados, fluxos, design system e telas.

## Scripts

| Comando        | Descrição              |
|----------------|------------------------|
| `npm run dev`  | Servidor de desenvolvimento |
| `npm run build`| Build de produção      |
| `npm run db:studio` | Prisma Studio (BD) |
| `npm run db:migrate` | Criar migração   |
