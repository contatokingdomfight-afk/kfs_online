# Primeiro push para o GitHub

O projeto já tem Git inicializado e o remote **origin** apontando para `https://github.com/OseiasBeu/kfs_system.git`. Falta criar o repositório no GitHub (se ainda não existir) e fazer o primeiro push.

---

## Opção A: O repositório já existe no GitHub

Se já criaste `OseiasBeu/kfs_system` no GitHub (mesmo que vazio):

1. No terminal, na pasta do projeto:
   ```bash
   git add .
   git status
   ```
   (Revê a lista; não deve aparecer `.env` nem `client_secret*.json`.)

2. Commit:
   ```bash
   git commit -m "KFS: app completa - auth, dashboard, Stripe, Google, deploy doc"
   ```

3. Push (primeira vez na branch main):
   ```bash
   git push -u origin main
   ```

Se a branch no GitHub tiver outro nome (ex.: `master`), a Vercel deixa-te escolher a branch ao importar; podes manter `main` e fazer push na mesma.

---

## Opção B: Ainda não criaste o repositório no GitHub

1. Abre [github.com/new](https://github.com/new) (ou **+** → **New repository**).
2. **Repository name**: `kfs_system` (ou outro nome; se mudares, atualiza o remote no passo 5).
3. **Description**: opcional, ex. "Kingdom Fight School – plataforma MVP".
4. Escolhe **Private** ou **Public**.
5. **Não** marques "Add a README", "Add .gitignore" nem "Choose a license" (já tens ficheiros no projeto).
6. Clica **Create repository**.

7. No terminal, na pasta do projeto:
   ```bash
   git add .
   git status
   git commit -m "KFS: app completa - auth, dashboard, Stripe, Google, deploy doc"
   git push -u origin main
   ```

Se o GitHub te tiver mostrado um URL diferente (ex.: `https://github.com/OseiasBeu/kfs_system.git`), confirma que o remote está certo:

```bash
git remote -v
```

Deve aparecer `origin` com esse URL. Se não, ajusta:

```bash
git remote set-url origin https://github.com/OseiasBeu/kfs_system.git
```

Depois: `git push -u origin main`.

---

## Verificação

- O `.gitignore` já inclui `.env` e `client_secret*.json`, por isso não vão no commit.
- Depois do push, em [github.com/OseiasBeu/kfs_system](https://github.com/OseiasBeu/kfs_system) deves ver todo o código.
- A seguir podes importar este repo na Vercel (ver **DOCS/Deploy_Vercel_kingdomfight.md**).
