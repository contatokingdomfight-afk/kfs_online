# Enviar o projeto para GitHub (OseiasBeu/kfs_system)

## Situação

- O repositório remoto é `https://github.com/OseiasBeu/kfs_system.git`.
- No teu PC, o `git push` pode estar a usar a conta **voluntarios-jpg** (credenciais do Windows), o que dá 403.
- Parte do código já foi enviada via MCP (config + DOCS + alguns ficheiros).

## Opção 1 – Recomendada: usar Git com a conta certa

1. **Credenciais no Windows**  
   Painel de Controlo → Gestor de Credenciais → Credenciais do Windows → procurar `github.com` e editar/remover para que o próximo push peça login.

2. **Ou usar SSH com a conta OseiasBeu**  
   - Gera uma chave SSH e adiciona em GitHub → Settings → SSH and GPG keys.  
   - Muda o remote para SSH:  
     `git remote set-url origin git@github.com:OseiasBeu/kfs_system.git`  
   - Depois: `git push -u origin main`.

3. **Ou token de acesso pessoal (HTTPS)**  
   - GitHub → Settings → Developer settings → Personal access tokens.  
   - Cria um token com scope `repo`.  
   - Quando o Git pedir password, usa o token em vez da password.

Assim fazes um único `git push` e sobem todos os ficheiros commitados.

## Opção 2 – Batches via script (se não puderes usar Git)

O script `prepare-push-batch.js` gera o ficheiro `push-batch.json` com um lote de ficheiros para enviar.

- **Uso:** `node scripts/prepare-push-batch.js <número_do_batch>`  
  Ex.: `node scripts/prepare-push-batch.js 0` → gera o primeiro lote, `1` → segundo, etc.
- O script exclui ficheiros já enviados (config + DOCS do primeiro envio).
- Com `BATCH_SIZE = 1` cada batch tem 1 ficheiro (útil para DOCS grandes).  
  Podes aumentar (ex.: 8) para ficheiros de código, que são mais pequenos.

Para enviar cada batch precisas de uma ferramenta que use a API do GitHub (token da conta OseiasBeu) ou do MCP configurado com essa conta; o script só prepara o `push-batch.json`.

## Resumo

- **Melhor:** corrigir credenciais/SSH/token e fazer `git push origin main`.
- **Alternativa:** usar `prepare-push-batch.js` e enviar cada `push-batch.json` via API ou MCP.
