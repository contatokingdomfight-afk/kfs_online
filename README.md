# Kingdom Fight School – KFS System

Plataforma de gestão e ensino da Kingdom Fight School (MVP). Mobile First.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + design tokens (DOCS)
- **Supabase** – autenticação + PostgreSQL
- **Prisma** – ORM (base de dados no Supabase)
- **Vercel** – deploy

## Começar

1. **Dependências**
   ```bash
   npm install
   ```

2. **Variáveis de ambiente**
   - Copiar `.env.example` para `.env`
   - Preencher `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Project Settings → API)
   - Preencher `DATABASE_URL` (Supabase → Project Settings → Database → connection string)
   - **Login com Google**: ver **DOCS/Login_Google_Supabase.md** (ativar provider no Supabase e configurar OAuth no Google Cloud)

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
- `components/` – UI reutilizável (incl. `fighter/` para perfil do atleta gamificado)
- `lib/` – Prisma, utils, i18n, belts, XP/missões, avaliação física
- `prisma/` – schema e migrações
- `DOCS/` – documentação do produto

## Funcionalidades principais

- **Perfil do atleta (gamificado)** – Faixas por cor (Branca → Dourado N), XP por conclusão de missões, progressão em dobro (1000 XP para Branca/amarela, depois o dobro por nível). Radar de atributos (Técnico, Tático, Físico, Mental, Teórico), detalhe por componente (filtrado pela modalidade principal do aluno), missões ativas (sistema + configuráveis no Admin).
- **Avaliação física** – Ficha de anamnese e avaliação inicial preenchida pelo instrutor no perfil do aluno; obrigatória a cada 6 meses; aparece como missão para o aluno até estar em dia. Disponível para todos os professores em **Perfil do aluno** e **Perfil do atleta**.
- **Admin** – Missões (criar/eliminar), critérios de avaliação por modalidade, componentes gerais (dimensões), turmas, planos, alunos, coaches, experimentais, financeiro, etc.

## Contas de teste

Não existem contas pré-criadas. Cria-as assim:

1. **Aluno**  
   - Regista-te em **Registar** com um email (ex.: `aluno@teste.com`).  
   - No Supabase → **Table Editor** → **User**: altera o campo **role** para `ALUNO`.  
   - O primeiro login já cria o registo em **Student** (sync automático).

2. **Professor (Coach)**  
   - Regista-te com outro email (ex.: `professor@teste.com`).  
   - No Supabase → **User**: altera **role** para `COACH`.  
   - Em **Coach**: clica **Insert row**, preenche **id** (ex.: um UUID ou CUID), **userId** = id do User desse email, **specialties** pode ficar vazio.

3. **Administrador**  
   - Usa o email do admin (ex.: `contatokingdomfight@gmail.com`).  
   - Em **User**, define **role** = `ADMIN`.

### Ver como Aluno / Professor (admin)

Com o email de administrador, na área **Admin** (canto superior direito) tens:

- **Ver como: Aluno** – abre o dashboard como se fosses aluno (agenda, etc.).  
- **Ver como: Professor** – abre a área Coach.

Em qualquer uma destas vistas aparece o banner **"A ver como Aluno"** ou **"A ver como Professor"** com o botão **Voltar ao Admin**.

## Deploy (Vercel + kingdomfight.com)

Guia completo em **DOCS/Deploy_Vercel_kingdomfight.md**: ligar o repositório à Vercel, configurar variáveis de ambiente, primeiro deploy e domínio **kingdomfight.com** (DNS na Hostinger).

## Documentação

Ver pasta **DOCS/** para visão, modelo de dados, fluxos, design system, telas e deploy.

## Scripts

| Comando        | Descrição              |
|----------------|------------------------|
| `npm run dev`  | Servidor de desenvolvimento |
| `npm run build`| Build de produção      |
| `npm run db:studio` | Prisma Studio (BD) |
| `npm run db:migrate` | Criar migração   |
