# Troubleshooting: Erro "We encountered an internal error" no Deploy Vercel

## O que está a acontecer

- **Build:** Conclui com sucesso ✓
- **Erro:** "Deploying outputs..." → "We encountered an internal error" (após ~20 segundos)

O erro ocorre **depois** do build, quando a Vercel tenta fazer upload dos ficheiros para a infraestrutura.

## ⚠️ PRIMEIRO: Alterar versão do Node.js

O projeto estava configurado para **Node 24.x**. Existe um bug conhecido (zlib memory leak) em Node 24 com Next.js que pode causar falhas.

**Passos:**
1. Vercel Dashboard → **kfs-online** → **Settings** → **General**
2. Em **Node.js Version**, selecionar **20.x** (em vez de 24.x)
3. Guardar e fazer **Redeploy** (com "Clear build cache")

O `package.json` já tem `"engines": { "node": "20.x" }` para reforçar esta configuração.

## O que já foi testado

- Build local: OK
- Deploy via CLI: mesmo erro
- Região alternativa: sem efeito
- Node 20.x: adicionado ao package.json (confirmar no dashboard)

## Próximos passos recomendados

### 1. Contactar suporte Vercel

- **Dashboard:** https://vercel.com/dashboard → **Help** → **Contact Support**
- **Ou:** https://vercel.com/help
- Incluir: **Deployment ID** (do log do deploy), **Project URL**, **mensagem de erro exata**

### 2. Verificar conta e limites

- Dashboard → **Settings** → **General**
- Verificar se há limites atingidos ou avisos na conta
- Verificar plano (Hobby / Pro) e quotas

### 3. Criar novo projeto (teste)

1. Dashboard → **Add New** → **Project**
2. Importar o mesmo repositório `kfs_online`
3. Configurar variáveis de ambiente
4. Fazer deploy

Se o novo projeto fizer deploy com sucesso, o problema pode estar no projeto atual.

### 4. Desativar temporariamente os crons

Editar `vercel.json` e deixar:

```json
{}
```

Fazer deploy. Se funcionar, o problema pode estar na configuração de crons. Depois adicionar os crons de novo.

### 5. Verificar status da Vercel

- https://www.vercel-status.com/
- Se houver incidentes, aguardar a resolução

---

## Alternativa: Deploy noutra plataforma

- **Netlify** – suporta Next.js
- **Railway** – suporta Next.js
- **Render** – suporta Next.js

O projeto pode ser migrado se o problema na Vercel persistir.
