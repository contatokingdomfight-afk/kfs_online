# Plano de Melhorias – Biblioteca (Cursos, Módulos e Unidades)

**Data:** 11 março 2026  
**Contexto:** Correções e melhorias na Biblioteca – tanto no perfil Admin/Professor (criar curso, adicionar módulos/unidades) quanto no perfil Aluno (visualizar curso).

---

## 1. Resumo das alterações solicitadas

| # | Área | Descrição |
|---|------|-----------|
| 1 | Admin – Adicionar módulo | Modal de carregamento ao clicar em "Adicionar módulo" |
| 2 | Admin – Adicionar unidade | Barra de carregamento ao adicionar unidade dentro do módulo |
| 3 | Admin – Formulários | Limpar formulário após criar módulo ou unidade (ficar pronto para adicionar mais) |
| 4 | Aluno – Visualização curso | Colapsar unidades (expandir/recolher) |
| 5 | Aluno – Progresso | Só permitir avançar para a próxima unidade após concluir a anterior |
| 6 | Aluno – Vídeo YouTube | Corrigir erro "conexão com o youtube falhou" |

---

## 2. Plano de ação detalhado

### 2.1 Modal de carregamento ao adicionar módulo

**Ficheiros envolvidos:**
- `app/admin/cursos/[id]/AddModuleSection.tsx` – botão "Adicionar módulo"
- `app/admin/cursos/modules/ModuleForm.tsx` – formulário de módulo

**Implementação:**
1. Ao clicar em "+ Adicionar módulo", mostrar um modal/overlay com:
   - Mensagem: "A adicionar módulo…" ou "Módulo a ser adicionado…"
   - Indicador de carregamento (spinner ou barra)
2. Quando o formulário é submetido (submit), o `useFormStatus` do React já indica estado `pending`. Usar esse estado para mostrar o overlay durante o submit.
3. O overlay deve cobrir o formulário de novo módulo para não permitir cliques múltiplos.

---

### 2.2 Barra de carregamento ao adicionar unidade

**Ficheiros envolvidos:**
- `app/admin/cursos/[id]/ModuleCard.tsx` – secção "Adicionar unidade (vídeo ou texto)"
- `app/admin/cursos/modules/units/UnitForm.tsx` – formulário de unidade

**Implementação:**
1. Ao submeter o formulário de nova unidade, mostrar uma barra de carregamento (ou spinner) acima/abaixo do formulário.
2. Usar `useFormStatus` do React para detectar o estado `pending` do submit.
3. Opcional: desativar o botão "Adicionar unidade" durante o submit.

---

### 2.3 Limpar formulário após criar módulo ou unidade

**Ficheiros envolvidos:**
- `app/admin/cursos/modules/ModuleForm.tsx`
- `app/admin/cursos/modules/units/UnitForm.tsx`
- `app/admin/cursos/[id]/AddModuleSection.tsx` – reset do formulário de módulo
- `app/admin/cursos/[id]/ModuleCard.tsx` – reset do formulário de unidade

**Implementação:**
1. **Módulo:** Após `success` (sem erro), o `ModuleForm` não tem controlo direto do formulário porque usa `defaultValue`. Opções:
   - Usar `key` para forçar remount do formulário quando o estado muda para sucesso;
   - Ou passar `onSuccess` do `ModuleForm` para o `AddModuleSection` resetar o estado (ex.: fechar e reabrir o painel, ou forçar um novo `ModuleForm` com `key` baseado em timestamp).
2. **Unidade:** Idem – após sucesso, usar `key` ou callback para resetar o `UnitForm` e manter o painel "Nova unidade" aberto para adicionar mais.
3. Alternativa: usar formulários controlados (estado) em vez de `defaultValue` para poder fazer `reset()` após sucesso.

---

### 2.4 Colapsar unidades na visualização do curso (aluno)

**Ficheiros envolvidos:**
- `app/dashboard/biblioteca/[id]/page.tsx` – página de detalhe do curso

**Implementação:**
1. Cada unidade (vídeo ou texto) dentro de um módulo fica colapsada por defeito.
2. Mostrar apenas o cabeçalho da unidade (ex.: "1. Aula 1" + botão "Marcar como concluído") num elemento clicável.
3. Ao clicar, expandir para mostrar o conteúdo (vídeo ou texto).
4. Usar `<details>`/`<summary>` ou estado React com `open`/`closed` para cada unidade.
5. Manter o módulo visível (título + descrição); apenas as unidades ficam colapsáveis.

---

### 2.5 Bloquear avanço até concluir a unidade anterior

**Ficheiros envolvidos:**
- `app/dashboard/biblioteca/[id]/page.tsx`
- `app/dashboard/biblioteca/ConcluirUnidadeButton.tsx` – lógica de conclusão

**Implementação:**
1. As unidades são ordenadas por `sort_order` dentro de cada módulo.
2. Regra: a unidade N só é visível/interativa se a unidade N-1 estiver concluída (ou se for a primeira).
3. Para a primeira unidade de cada módulo: sempre acessível.
4. Para as seguintes: verificar se `completedUnitIds` contém o ID da unidade anterior.
5. Se bloqueada: mostrar a unidade com aparência desativada (opacidade reduzida, sem botão de concluir) e mensagem tipo "Conclui a unidade anterior para desbloquear."
6. Opcional: permitir expandir para ver o título, mas não o conteúdo, até desbloquear.

---

### 2.6 Corrigir erro "conexão com o youtube falhou"

**Ficheiros envolvidos:**
- `app/dashboard/biblioteca/[id]/page.tsx` – função `toEmbedVideoUrl`
- Possivelmente `app/coach/biblioteca/[id]/page.tsx` – mesma lógica

**Causas prováveis:**
1. **Formato URL incorreto:** `toEmbedVideoUrl` não trata todos os formatos do YouTube:
   - `https://www.youtube.com/watch?v=VIDEO_ID` ✓
   - `https://youtu.be/VIDEO_ID` ✓
   - `https://www.youtube.com/shorts/VIDEO_ID` ✓ (falta implementar)
   - `https://www.youtube.com/embed/VIDEO_ID` ✓ (já é embed)
   - URLs com parâmetros extras: `?t=123`, `&list=...`

2. **Vídeo:** O vídeo pode estar privado, com embed desativado ou região restrita.

3. **Referrer:** Alguns vídeos bloqueiam embed em domínios não autorizados.

**Implementação:**
1. Melhorar `toEmbedVideoUrl` para suportar:
   - `youtube.com/shorts/VIDEO_ID` – extrair ID do path
   - `youtube.com/embed/VIDEO_ID` – devolver como está
   - `youtube.com/v/VIDEO_ID` – formato antigo
2. Adicionar parâmetro `?rel=0` no embed para reduzir vídeos relacionados (opcional).
3. Adicionar fallback visual: se o iframe falhar (evento `onError`), mostrar mensagem amigável: "Este vídeo não está disponível. Verifica se o link está correto e se o vídeo permite incorporação."
4. Documentar que vídeos privados ou com embed desativado não funcionarão.

---

## 3. Ordem de implementação sugerida

| # | Tarefa | Prioridade | Complexidade |
|---|--------|------------|--------------|
| 1 | Modal de carregamento ao adicionar módulo | Alta | Média |
| 2 | Barra de carregamento ao adicionar unidade | Alta | Baixa |
| 3 | Limpar formulário após criar módulo/unidade | Alta | Média |
| 4 | Colapsar unidades na visualização do curso | Média | Média |
| 5 | Bloquear avanço até concluir unidade anterior | Média | Média |
| 6 | Corrigir YouTube (URLs + fallback) | Alta | Média |

---

## 4. Notas técnicas

- **useFormStatus:** Requer que o componente que usa `useFormStatus` esteja dentro do `<form>`. O React 19 usa `useFormStatus`; em versões anteriores pode ser necessário `useFormStatus` de `react-dom`.
- **Formulários:** O `ModuleForm` e `UnitForm` usam `useFormState` com server actions. O `router.refresh()` é chamado após sucesso. Para limpar o formulário, o `key` pode ser incrementado no pai quando `state.success` é true.
- **YouTube:** A mensagem "conexão com o youtube falhou" pode vir do próprio iframe do YouTube quando o vídeo não carrega ou do browser. Não há API nativa para detectar falha de iframe de forma fiável; a alternativa é usar `postMessage` ou um timeout, mas o fallback visual é mais simples.

---

## 5. Checklist para aprovação

- [ ] Modal de carregamento ao adicionar módulo – mensagem e UX conforme esperado?
- [ ] Barra de carregamento ao adicionar unidade – suficiente ou preferir outro tipo de feedback?
- [ ] Limpar formulário – manter painel aberto para adicionar mais ou fechar após criar?
- [ ] Unidades colapsadas – colapsar por defeito ou expandir a primeira?
- [ ] Bloqueio sequencial – bloquear só o conteúdo ou também o botão "Marcar como concluído"?
- [ ] YouTube – qual URL de teste está a falhar? (para reproduzir e corrigir)

---

**Aguardando aprovação para iniciar o desenvolvimento.**
