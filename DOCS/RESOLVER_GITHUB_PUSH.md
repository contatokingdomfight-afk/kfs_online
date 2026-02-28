# 🔧 Resolver Problema de Push no GitHub

## ⚠️ Erro Atual

```
remote: Permission to contatokingdomfight-afk/kfs_online.git denied to voluntarios-jpg.
fatal: unable to access 'https://github.com/contatokingdomfight-afk/kfs_online.git/': The requested URL returned error: 403
```

**Causa**: O Git está usando credenciais do usuário `voluntarios-jpg` ao invés de `contatokingdomfight-afk`.

---

## ✅ Solução Rápida: Personal Access Token

### Passo 1: Criar Token no GitHub

1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token (classic)"**
3. Dê um nome: `KFS Deploy Token`
4. Selecione os scopes:
   - ✅ `repo` (acesso completo aos repositórios)
   - ✅ `workflow` (se usar GitHub Actions)
5. Clique em **"Generate token"**
6. **COPIE O TOKEN** (você não verá novamente!)
   - Exemplo: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Passo 2: Configurar Git com o Token

Abra o PowerShell e execute:

```powershell
# Substitua SEU_TOKEN pelo token copiado
git remote set-url origin https://SEU_TOKEN@github.com/contatokingdomfight-afk/kfs_online.git

# Fazer push
git push origin main
```

**Exemplo completo:**
```powershell
git remote set-url origin https://ghp_abc123xyz789@github.com/contatokingdomfight-afk/kfs_online.git
git push origin main
```

---

## 🔐 Solução Alternativa: GitHub CLI

Se preferir usar o GitHub CLI (mais seguro):

### Passo 1: Instalar GitHub CLI

1. Baixe em: https://cli.github.com/
2. Execute o instalador
3. Reinicie o PowerShell

### Passo 2: Fazer Login

```powershell
gh auth login
```

Siga as instruções:
1. Escolha: **GitHub.com**
2. Escolha: **HTTPS**
3. Escolha: **Login with a web browser**
4. Copie o código e cole no navegador
5. Autorize o acesso

### Passo 3: Fazer Push

```powershell
git push origin main
```

---

## 🌐 Solução Alternativa: Upload Manual

Se nenhuma das opções acima funcionar:

### Opção 1: Via Interface Web do GitHub

1. Acesse: https://github.com/contatokingdomfight-afk/kfs_online
2. Clique em **"Add file"** → **"Upload files"**
3. Arraste TODOS os arquivos do projeto (exceto `node_modules`, `.next`, `.git`)
4. Commit message: `feat: Sistema multi-escola e professores como alunos`
5. Clique em **"Commit changes"**

### Opção 2: Criar Novo Repositório

1. Acesse: https://github.com/new
2. Nome: `kfs_online`
3. Deixe público ou privado
4. **NÃO** inicialize com README
5. Clique em **"Create repository"**
6. Siga as instruções para push de repositório existente

---

## 🔍 Verificar Credenciais Atuais

Para ver qual usuário o Git está usando:

```powershell
git config --list | Select-String "user"
```

Para ver o remote atual:

```powershell
git remote -v
```

---

## 📝 Após Resolver o Push

Quando o push funcionar, você verá:

```
Enumerating objects: 100, done.
Counting objects: 100% (100/100), done.
Delta compression using up to 8 threads
Compressing objects: 100% (50/50), done.
Writing objects: 100% (60/60), 50.00 KiB | 5.00 MiB/s, done.
Total 60 (delta 30), reused 0 (delta 0), pack-reused 0
To https://github.com/contatokingdomfight-afk/kfs_online.git
   abc1234..def5678  main -> main
```

Depois disso, você pode:

1. ✅ Verificar no GitHub se os arquivos foram enviados
2. ✅ Prosseguir com o deploy na Vercel
3. ✅ Configurar as variáveis de ambiente
4. ✅ Fazer o primeiro deploy

---

## 🆘 Ainda com Problemas?

### Erro: "Authentication failed"

**Solução**: O token pode estar incorreto ou expirado
- Gere um novo token
- Certifique-se de copiar o token completo
- Verifique se selecionou o scope `repo`

### Erro: "Repository not found"

**Solução**: Verifique se o repositório existe
- Acesse: https://github.com/contatokingdomfight-afk/kfs_online
- Se não existir, crie um novo repositório

### Erro: "Failed to push some refs"

**Solução**: Pode haver conflitos
```powershell
git pull origin main --rebase
git push origin main
```

---

## 📞 Comandos Úteis

```powershell
# Ver status do repositório
git status

# Ver histórico de commits
git log --oneline -5

# Ver diferenças
git diff

# Ver remote configurado
git remote -v

# Reconfigurar remote
git remote remove origin
git remote add origin https://github.com/contatokingdomfight-afk/kfs_online.git
```

---

**Última atualização**: 28 de Fevereiro de 2026
