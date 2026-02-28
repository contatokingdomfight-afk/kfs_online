# Sistema Multi-Escola - Kingdom Fight School

## 📋 Resumo

Implementação completa do sistema multi-escola e funcionalidade de coaches como alunos.

## ✨ Funcionalidades Implementadas

### 1. 🏫 Sistema Multi-Escola

Suporte para múltiplas escolas físicas da rede Kingdom Fight School, permitindo:

- **Gestão de Escolas**: Criar, editar e ativar/desativar escolas
- **Isolamento de Dados**: Cada escola tem seus próprios alunos, coaches, aulas, locais e planos
- **Filtros por Escola**: Todas as listagens podem ser filtradas por escola
- **Escola Padrão**: Novos alunos são automaticamente associados à primeira escola ativa

#### Informações da Escola

Cada escola pode ter:
- Nome (obrigatório)
- Cidade
- Morada completa
- Telefone
- Email
- Status (Ativa/Inativa)

### 2. 👨‍🏫 Coaches como Alunos

Permite que professores também sejam alunos, podendo:

- **Perfil Duplo**: Um coach pode ter perfil de aluno associado
- **Acesso ao Dashboard**: Coaches com perfil de aluno veem link "Minha área de aluno" no menu
- **Treino e Ensino**: Professores podem treinar e ensinar na mesma escola
- **Criação Opcional**: Ao criar coach, pode-se marcar checkbox para criar perfil de aluno automaticamente

## 📁 Estrutura de Dados

### Modelo School (Novo)

```typescript
model School {
  id          String   @id @default(cuid())
  name        String
  address     String?
  city        String?
  phone       String?
  email       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @default(now())

  students    Student[]
  coaches     Coach[]
  lessons     Lesson[]
  locations   Location[]
  plans       Plan[]
}
```

### Alterações nos Modelos Existentes

#### Student
- **Adicionado**: `schoolId` (obrigatório)
- **Relação**: `school School`

#### Coach
- **Adicionado**: `schoolId` (obrigatório)
- **Adicionado**: `studentId` (opcional, único)
- **Relações**: `school School`

#### Lesson
- **Adicionado**: `schoolId` (obrigatório)
- **Relação**: `school School`

#### Location
- **Adicionado**: `schoolId` (obrigatório)
- **Relação**: `school School`

#### Plan
- **Adicionado**: `schoolId` (obrigatório)
- **Relação**: `school School`

## 🗄️ Migration SQL

Ficheiro: `prisma/migrations/add_school_system.sql`

### Passos da Migration

1. **Criar tabela School**
2. **Inserir escola padrão** (`default-school-001`)
3. **Adicionar campos schoolId** (nullable primeiro)
4. **Atualizar registos existentes** com escola padrão
5. **Tornar schoolId obrigatório** (NOT NULL)
6. **Adicionar foreign keys**
7. **Adicionar studentId ao Coach**
8. **Criar índices** para performance
9. **Adicionar comentários** de documentação

### Como Executar a Migration

```bash
# Via Supabase SQL Editor
# Copiar e colar o conteúdo de prisma/migrations/add_school_system.sql
```

**IMPORTANTE**: Esta migration deve ser executada ANTES de fazer deploy da nova versão do código.

## 🎨 Interface de Usuário

### Admin - Gestão de Escolas

**Rota**: `/admin/escolas`

**Funcionalidades**:
- Listar todas as escolas
- Criar nova escola
- Editar escola existente
- Ativar/Desativar escola
- Visualizar informações completas (nome, cidade, morada, telefone, email)

**Componentes**:
- `app/admin/escolas/page.tsx` - Página principal
- `app/admin/escolas/EscolasManager.tsx` - Componente de gestão
- `app/admin/escolas/actions.ts` - Server actions

### Admin - Filtros por Escola

Adicionado filtro de escola em:
- **Alunos** (`/admin/alunos`) - Filtrar alunos por escola
- **Turmas** (`/admin/turmas`) - Selecionar escola ao criar aula
- **Locais** (`/admin/locais`) - Selecionar escola ao criar local
- **Planos** (`/admin/planos`) - Selecionar escola ao criar plano

### Coach - Área de Aluno

Se o coach tiver perfil de aluno:
- Link "Minha área de aluno" aparece no menu lateral
- Redireciona para `/dashboard` (área do aluno)
- Coach pode ver suas próprias aulas, performance, missões, etc.

### Criação de Entidades

Todos os formulários de criação agora incluem:
- **Select de Escola**: Dropdown com escolas ativas
- **Validação**: Escola é obrigatória
- **Coach como Aluno**: Checkbox opcional ao criar coach

## 🔧 Funções Helper

### `lib/auth/get-current-school.ts`

```typescript
// Obtém schoolId do usuário atual
getCurrentSchoolId(): Promise<string | null>

// Verifica se usuário tem acesso a uma escola
hasAccessToSchool(schoolId: string): Promise<boolean>
```

### `lib/auth/get-coach-student-id.ts`

```typescript
// Verifica se coach tem perfil de aluno
getCoachStudentId(): Promise<string | null>
```

## 📊 Lógica de Acesso

### ADMIN
- Acesso a **todas as escolas**
- Pode criar e gerenciar escolas
- Pode ver dados de qualquer escola

### COACH
- Acesso apenas à **sua escola**
- Vê apenas alunos e aulas da sua escola
- Se tiver perfil de aluno, acessa dashboard como aluno

### ALUNO
- Acesso apenas à **sua escola**
- Vê apenas aulas da sua escola
- Não vê dados de outras escolas

## 🚀 Fluxo de Criação

### Nova Escola

1. Admin acede a `/admin/escolas`
2. Clica em "Nova escola"
3. Preenche: Nome, Cidade, Morada, Telefone, Email
4. Escola criada e ativa por padrão

### Novo Aluno

1. Admin acede a `/admin/alunos/novo`
2. Seleciona **Escola**
3. Preenche Email e Nome
4. Aluno criado e associado à escola selecionada

### Novo Coach

1. Admin acede a `/admin/coaches/novo`
2. Seleciona **Escola**
3. Preenche Email, Nome, Especialidades
4. **Opcional**: Marca checkbox "Este coach também é aluno"
5. Se marcado, cria automaticamente perfil de Student
6. Coach criado e associado à escola

### Nova Aula

1. Admin acede a `/admin/turmas`
2. Seleciona **Escola** (obrigatório)
3. Seleciona Modalidade, Data, Horários, Coach, Local
4. Aula criada e visível apenas para alunos daquela escola

## 🔐 Segurança

### Isolamento de Dados

- Queries filtradas por `schoolId` automaticamente
- Foreign keys com `ON DELETE CASCADE`
- Índices para performance

### Validações

- Escola obrigatória em todas as entidades
- Verificação de acesso antes de operações
- Admin bypass para gestão global

## 📝 Ficheiros Modificados

### Schema e Migrations

- `prisma/schema.prisma` - Adicionado modelo School e campos schoolId
- `prisma/migrations/add_school_system.sql` - Migration SQL completa

### Páginas Admin

- `app/admin/page.tsx` - Link para Escolas
- `app/admin/layout.tsx` - Menu com Escolas
- `app/admin/escolas/page.tsx` - Gestão de escolas (NOVO)
- `app/admin/escolas/EscolasManager.tsx` - Componente de gestão (NOVO)
- `app/admin/escolas/actions.ts` - Actions de escola (NOVO)
- `app/admin/alunos/page.tsx` - Filtro por escola
- `app/admin/alunos/novo/NovoAlunoForm.tsx` - Select de escola
- `app/admin/alunos/actions.ts` - Validação de schoolId
- `app/admin/coaches/novo/NovoCoachForm.tsx` - Select de escola e checkbox
- `app/admin/coaches/actions.ts` - Criação de perfil de aluno
- `app/admin/turmas/page.tsx` - Busca de escolas
- `app/admin/turmas/CreateLessonForm.tsx` - Select de escola
- `app/admin/turmas/actions.ts` - Validação de schoolId
- `app/admin/locais/LocaisManager.tsx` - Select de escola
- `app/admin/locais/actions.ts` - Validação de schoolId
- `app/admin/planos/PlanForm.tsx` - Select de escola
- `app/admin/planos/actions.ts` - Validação de schoolId
- `app/admin/planos/[id]/page.tsx` - Passar schoolId

### Área do Coach

- `app/coach/layout.tsx` - Link para área de aluno se aplicável

### Área do Aluno

- `app/dashboard/page.tsx` - Filtrar aulas por escola

### Bibliotecas

- `lib/auth/get-current-school.ts` - Helper para schoolId (NOVO)
- `lib/auth/get-coach-student-id.ts` - Helper para coach-aluno (NOVO)
- `lib/auth/sync-user.ts` - Associar escola padrão ao criar aluno
- `lib/i18n/messages.ts` - Traduções (navSchools, myStudentArea)

### API

- `app/api/schools/route.ts` - Endpoint para buscar escolas (NOVO)

## 🧪 Testes Recomendados

### Escolas

- [ ] Criar nova escola
- [ ] Editar escola existente
- [ ] Desativar escola
- [ ] Reativar escola
- [ ] Verificar que escola inativa não aparece em selects

### Alunos

- [ ] Criar aluno em escola A
- [ ] Verificar que aluno vê apenas aulas da escola A
- [ ] Criar aluno em escola B
- [ ] Verificar isolamento entre escolas

### Coaches

- [ ] Criar coach sem perfil de aluno
- [ ] Criar coach COM perfil de aluno
- [ ] Verificar que coach-aluno vê link "Minha área de aluno"
- [ ] Acessar dashboard como coach-aluno
- [ ] Verificar que coach vê apenas dados da sua escola

### Aulas

- [ ] Criar aula em escola A
- [ ] Verificar que apenas alunos da escola A veem a aula
- [ ] Criar aula em escola B
- [ ] Verificar isolamento

### Planos e Locais

- [ ] Criar plano em escola específica
- [ ] Criar local em escola específica
- [ ] Verificar que aparecem apenas para aquela escola

## 🎯 Casos de Uso

### Caso 1: Franquia com Múltiplas Unidades

**Cenário**: Kingdom Fight School tem 3 unidades (Lisboa, Porto, Faro)

**Solução**:
1. Criar 3 escolas no sistema
2. Cada escola tem seus próprios coaches e alunos
3. Planos podem ser específicos de cada escola
4. Relatórios podem ser filtrados por escola

### Caso 2: Coach que Também Treina

**Cenário**: Professor João ensina Muay Thai mas também treina Boxing

**Solução**:
1. Criar coach com checkbox "também é aluno" marcado
2. João tem acesso à área de coach (`/coach`)
3. João também tem acesso à área de aluno (`/dashboard`)
4. Como aluno, João pode marcar presença, ver performance, etc.

### Caso 3: Expansão para Nova Cidade

**Cenário**: Abrir nova unidade em Braga

**Solução**:
1. Admin cria nova escola "KFS Braga"
2. Adiciona coaches específicos para Braga
3. Cria locais de treino em Braga
4. Define planos para Braga (podem ser diferentes de Lisboa)
5. Novos alunos são associados à escola de Braga

## 📈 Próximos Passos Sugeridos

1. **Dashboard de Escola**: Estatísticas por escola (alunos ativos, receita, etc.)
2. **Transferência de Alunos**: Permitir mover aluno entre escolas
3. **Relatórios Comparativos**: Comparar performance entre escolas
4. **Configurações por Escola**: Horários, regras, etc. específicas
5. **Multi-tenancy Completo**: Subdomínios por escola (lisboa.kfs.com, porto.kfs.com)

## 🐛 Pontos de Atenção

### Migration Obrigatória

**CRÍTICO**: A migration SQL DEVE ser executada ANTES de fazer deploy do novo código.

```sql
-- Executar no Supabase SQL Editor
-- Ficheiro: prisma/migrations/add_school_system.sql
```

### Escola Padrão

O sistema cria automaticamente uma escola padrão:
- **ID**: `default-school-001`
- **Nome**: "Kingdom Fight School - Sede Principal"
- **Cidade**: "Lisboa"

Todos os dados existentes serão associados a esta escola.

### Dados Existentes

Após a migration:
- Todos os alunos existentes → Escola padrão
- Todos os coaches existentes → Escola padrão
- Todas as aulas existentes → Escola padrão
- Todos os locais existentes → Escola padrão
- Todos os planos existentes → Escola padrão

### Performance

Índices criados automaticamente:
- `Student_schoolId_idx`
- `Coach_schoolId_idx`
- `Lesson_schoolId_idx`
- `Location_schoolId_idx`
- `Plan_schoolId_idx`
- `Coach_studentId_idx`

## 🔄 Fluxo de Dados

### Criação de Novo Aluno (via OAuth)

```typescript
1. Usuário faz login com Google
2. syncUser() é chamado
3. Busca primeira escola ativa
4. Cria Student com schoolId da escola
5. Aluno vê apenas aulas daquela escola
```

### Criação de Coach como Aluno

```typescript
1. Admin marca checkbox "também é aluno"
2. Sistema cria User com role COACH
3. Sistema cria Student na mesma escola
4. Sistema cria Coach com studentId do Student
5. Coach tem acesso a /coach e /dashboard
```

## 📱 Interface

### Menu Admin

Ordem dos links:
1. Início
2. **Escolas** (NOVO)
3. Alunos
4. Atletas
5. Turmas / Aulas
6. Locais
7. Modalidades
8. Planos
9. Cursos / Biblioteca
10. Eventos
11. Configurações
12. Presença
13. Componentes gerais
14. Critérios de avaliação
15. Missões
16. Financeiro
17. Experimentais
18. Coaches

### Menu Coach (com perfil de aluno)

Links adicionais:
- **Minha área de aluno** → `/dashboard`

### Filtros

Todos os filtros mantêm estado:
- Status + Modalidade + Escola (alunos)
- Escola (aulas, locais, planos)

## 🎓 Decisões de Design

### Por que Escola Padrão?

- **Retrocompatibilidade**: Dados existentes não quebram
- **Simplicidade**: Novos usuários são automaticamente associados
- **Flexibilidade**: Admin pode criar mais escolas quando necessário

### Por que studentId Opcional no Coach?

- **Flexibilidade**: Nem todos os coaches querem/precisam treinar
- **Simplicidade**: Não força criação de perfil desnecessário
- **Performance**: Menos dados se não for usado

### Por que schoolId Obrigatório?

- **Isolamento**: Garante que dados não vazam entre escolas
- **Segurança**: Previne acesso não autorizado
- **Clareza**: Sempre sabemos a qual escola uma entidade pertence

## 🔍 Verificações de Segurança

### getCurrentSchoolId()

Retorna:
- **ALUNO**: schoolId do Student
- **COACH**: schoolId do Coach
- **ADMIN**: null (acesso a tudo)

### hasAccessToSchool()

Verifica:
- **ADMIN**: sempre true
- **COACH/ALUNO**: compara schoolId

### Queries Filtradas

Todas as queries principais agora filtram por escola:
- Dashboard do aluno
- Listagem de alunos (admin)
- Listagem de aulas
- Etc.

## 📊 Estatísticas

### Antes

- 1 escola implícita
- Sem isolamento de dados
- Coaches não podiam ser alunos

### Depois

- ∞ escolas possíveis
- Isolamento completo por escola
- Coaches podem ter perfil duplo
- Filtros por escola em todas as listagens
- API endpoint para buscar escolas

## ✅ Checklist de Deploy

- [ ] Executar migration SQL no Supabase
- [ ] Verificar que escola padrão foi criada
- [ ] Verificar que dados existentes foram associados
- [ ] Testar criação de nova escola
- [ ] Testar criação de aluno em escola específica
- [ ] Testar criação de coach com perfil de aluno
- [ ] Testar filtros por escola
- [ ] Testar acesso de coach à área de aluno
- [ ] Verificar isolamento entre escolas

---

**Data**: 23 de Fevereiro de 2026  
**Versão**: 1.0  
**Autor**: AI Assistant (Claude Sonnet 4.5)
