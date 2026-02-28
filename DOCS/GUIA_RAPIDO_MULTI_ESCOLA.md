# Guia Rápido: Sistema Multi-Escola

## 🚀 Início Rápido

### Passo 1: Executar Migration

**IMPORTANTE**: Execute ANTES de fazer deploy do novo código!

1. Aceda ao Supabase Dashboard
2. Vá para SQL Editor
3. Copie o conteúdo de `prisma/migrations/add_school_system.sql`
4. Execute o SQL
5. Verifique que a escola padrão foi criada:

```sql
SELECT * FROM "School";
-- Deve retornar: default-school-001 | Kingdom Fight School - Sede Principal
```

### Passo 2: Verificar Dados Existentes

Todos os dados existentes foram associados à escola padrão:

```sql
-- Verificar alunos
SELECT COUNT(*) FROM "Student" WHERE "schoolId" = 'default-school-001';

-- Verificar coaches
SELECT COUNT(*) FROM "Coach" WHERE "schoolId" = 'default-school-001';

-- Verificar aulas
SELECT COUNT(*) FROM "Lesson" WHERE "schoolId" = 'default-school-001';
```

### Passo 3: Criar Novas Escolas

1. Login como **ADMIN**
2. Aceda a **Admin** → **Escolas**
3. Clique em **"+ Nova escola"**
4. Preencha:
   - Nome (obrigatório)
   - Cidade
   - Morada
   - Telefone
   - Email
5. Clique em **"Criar escola"**

### Passo 4: Criar Alunos em Escola Específica

1. Aceda a **Admin** → **Alunos** → **"Novo aluno"**
2. Selecione a **Escola**
3. Preencha Email e Nome
4. Clique em **"Enviar convite"**

### Passo 5: Criar Coach como Aluno

1. Aceda a **Admin** → **Coaches** → **"Novo coach"**
2. Selecione a **Escola**
3. Preencha Email, Nome, Especialidades
4. ✅ Marque **"Este coach também é aluno"**
5. Clique em **"Enviar convite"**

O coach agora tem:
- Acesso à área `/coach` (ensinar)
- Acesso à área `/dashboard` (treinar)
- Link "Minha área de aluno" no menu

## 🎯 Casos de Uso Comuns

### Caso 1: Abrir Nova Unidade

**Situação**: Vamos abrir Kingdom Fight School no Porto

**Passos**:
1. Criar escola "KFS Porto"
2. Criar coaches para Porto
3. Criar locais de treino no Porto
4. Criar planos específicos do Porto (se necessário)
5. Adicionar alunos ao Porto

**Resultado**: Porto funciona independente de Lisboa

### Caso 2: Professor que Treina

**Situação**: Coach Maria ensina Boxing mas também treina Muay Thai

**Passos**:
1. Criar coach com checkbox "também é aluno" marcado
2. Maria acede a `/coach` para ensinar
3. Maria acede a `/dashboard` para ver suas aulas como aluna
4. Maria marca presença nas aulas de Muay Thai
5. Maria vê sua própria performance e missões

### Caso 3: Filtrar Alunos por Escola

**Situação**: Ver apenas alunos de Lisboa

**Passos**:
1. Aceda a `/admin/alunos`
2. Clique no filtro de escola
3. Selecione "KFS Lisboa"
4. Lista mostra apenas alunos de Lisboa

## 📋 Checklist de Verificação

Após executar a migration, verifique:

- [ ] Tabela `School` existe
- [ ] Escola padrão foi criada
- [ ] Todos os `Student` têm `schoolId`
- [ ] Todos os `Coach` têm `schoolId`
- [ ] Todos os `Lesson` têm `schoolId`
- [ ] Todos os `Location` têm `schoolId`
- [ ] Todos os `Plan` têm `schoolId`
- [ ] Campo `Coach.studentId` existe
- [ ] Índices foram criados
- [ ] Foreign keys funcionam

## 🔍 Resolução de Problemas

### Erro: "Nenhuma escola ativa encontrada"

**Causa**: Não há escolas no sistema

**Solução**:
```sql
INSERT INTO "School" ("id", "name", "city", "isActive")
VALUES ('default-school-001', 'Kingdom Fight School - Sede Principal', 'Lisboa', true);
```

### Erro: "Escola é obrigatória"

**Causa**: Tentando criar entidade sem selecionar escola

**Solução**: Sempre selecione uma escola nos formulários

### Coach não vê "Minha área de aluno"

**Causa**: Coach não tem perfil de aluno associado

**Solução**: 
1. Editar coach no admin
2. Ou criar manualmente Student e associar via SQL:
```sql
UPDATE "Coach" SET "studentId" = 'ID_DO_STUDENT' WHERE "id" = 'ID_DO_COACH';
```

### Aluno vê aulas de outra escola

**Causa**: Aulas sem schoolId ou schoolId incorreto

**Solução**:
```sql
-- Verificar aulas sem escola
SELECT * FROM "Lesson" WHERE "schoolId" IS NULL;

-- Corrigir se necessário
UPDATE "Lesson" SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;
```

## 🎓 Boas Práticas

### Nomenclatura de Escolas

Recomendamos:
- `KFS [Cidade]` - Ex: "KFS Lisboa", "KFS Porto"
- `Kingdom Fight School - [Bairro]` - Ex: "Kingdom Fight School - Benfica"

### Gestão de Coaches

- Coaches que só ensinam: NÃO marcar checkbox
- Coaches que também treinam: MARCAR checkbox
- Um coach pode ensinar em uma escola e treinar em outra (criar 2 perfis separados)

### Planos por Escola

- Planos podem ter preços diferentes por escola
- Planos são específicos de cada escola
- Um aluno só vê planos da sua escola

### Locais

- Cada local pertence a uma escola
- Útil para escolas com múltiplas sedes
- Ex: "KFS Lisboa - Benfica", "KFS Lisboa - Alvalade"

## 📞 Suporte

Se tiver dúvidas ou problemas:

1. Verifique a documentação completa: `DOCS/SISTEMA_MULTI_ESCOLA.md`
2. Consulte a migration: `prisma/migrations/add_school_system.sql`
3. Verifique o schema: `prisma/schema.prisma`

---

**Última atualização**: 23 de Fevereiro de 2026
