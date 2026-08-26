# Timer de rounds (área Coach)

> **Última revisão:** 19 maio 2026 — UX «luvas calçadas» (zona larga para pausar/continuar, Enter), pausa automática ao esconder o separador, hierarquia em 3 zonas, duas barras de progresso (restante no topo, decorrido em baixo), feedback visual nos últimos 10 s do round, presets como «rotinas», contagem inicial por defeito 12 s.  
> **Rotas:** página dedicada **`/coach/round-timer`**; variante embutida na gestão da aula **`/coach/aula`** (`RoundTimerClient` com `variant="embedded"`).

## Ficheiros principais

| Área | Caminho |
|------|---------|
| UI cliente | `components/coach/round-timer/RoundTimerClient.tsx` |
| Estilos (fases, botões, barra de acções) | `app/coach/round-timer/round-timer.css` |
| Motor de fases / tempo | `lib/round-timer/engine.ts`, `lib/round-timer/types.ts` |
| Sons | `lib/round-timer/audio.ts` |
| Presets e sessão (localStorage) | `lib/round-timer/persistence.ts` |
| Rolo minutos/segundos | `components/coach/round-timer/DurationRollPicker.tsx` |
| Página | `app/coach/round-timer/page.tsx` |

**Permissões:** prefixo `/coach/round-timer` em `lib/permissions/paths.ts` (alinhado a outras rotas coach).

## Fases do treino

1. **Idle / Finished** — configuração e **Iniciar**.  
2. **Countdown** — preparação (opcional, segundos configuráveis).  
3. **Round** — trabalho; índice 0-based em estado.  
4. **Rest** — descanso entre rounds (pode ser 0 s; último round vai directamente para **finished** sem descanso).
   - **Descanso a 0 s (ago. 2026):** com `restSec = 0`, `catchUp()` no motor (`lib/round-timer/engine.ts`) colapsa `round → rest → round` na mesma iteração — a fase `rest` nunca chega a ser observada pela UI. `RoundTimerClient.tsx` deteta esse salto pela mudança de `roundIdx` com a fase a manter-se `round` e toca fim + início de round em sequência (sem isto, os sinos ficavam mudos sempre que não havia descanso entre assaltos).
5. **Paused** — snapshot da fase actual.

O atributo `data-ui` na raiz (idle / prepare / round / rest / done) vem de `uiKind()` sobre a fase efectiva (em pausa, a fase congelada) e pinta `--rt-accent`, `--rt-surface`, `--rt-clock` e os botões primários. Nos últimos ~10 s de um **round** a correr, `data-rt-urgent` activa pulso suave de fundo e dígitos amarelos (respeita `prefers-reduced-motion`).

## UX em treino (distância / luvas)

- **Zona de toque:** com o cronómetro a correr ou em pausa, a área central (contexto + tempo + linha de estado) funciona como atalho gigante para **pausar** ou **continuar**; toques em `button`, `a`, `input` ou `select` não disparam o toggle. Há também suporte por teclado (**Enter** / **espaço**) quando a zona está focada. As barras de progresso ficam **fora** desta zona para evitar papéis ARIA aninhados (`progressbar` dentro de `button`).
- **Pausa ao fundo:** `visibilitychange` / `pagehide` com documento **hidden** chamam `pauseState` — chamadas ou mudança de app não devem «roubar» tempo; a sessão continua gravada em `localStorage` como antes.
- **Configuração:** ordem dos pilares — duração do assalto, descanso, número de assaltos (`+` / `−`), contagem inicial; preset **«Guardar como rotina»**.

## Sons (ficheiros estáticos)

Ficheiros em **`public/sounds/round-timer/`** (servidos como `/sounds/round-timer/...`):

| Ficheiro | Uso |
|----------|-----|
| **`end__boxing-bell.wav`** | Início de cada round (após preparação ou descanso) **e** fim de cada round (antes do descanso ou fim do treino). |
| **`digital-beep.wav`** | Avisos nos últimos segundos (ver tabela abaixo). |
| `start__boxing-bell.wav` | *Opcional / legado no disco;* o código **não** referencia este ficheiro desde a unificação do sino. |

**Desbloqueio de áudio (mobile):** `unlockAudio()` em `audio.ts` — chamado no **Start**, nas transições de fase e antes dos bips; convém testar com um toque real do utilizador no botão Iniciar.

**Reprodução via Web Audio API (ago. 2026):** o sino e o beep digital tocam via `AudioBufferSourceNode` (Web Audio API), não `new Audio(url)` — um `<audio>` HTML faz o browser/WebView pedir foco de áudio **exclusivo** ao SO, pausando música de fundo (YouTube Music, Spotify) no telemóvel do coach; a Web Audio API não disputa esse foco. `ensureResumed()` reactiva o `AudioContext` **antes de cada som** (não só uma vez no arranque) — alguns tablets suspendem o contexto sozinhos a meio da sessão (poupança de energia, ecrã a apagar), o que fazia o som ficar «agendado» mas nunca ouvido. Há um *fallback* para `<audio>` tradicional se o Web Audio falhar de vez (contexto indisponível ou som não descodifica).

### Quando toca o digital-beep

| Momento | Comportamento |
|---------|-----------------|
| **Preparo (countdown)** | Um bip por segundo “visível” **5 → 4 → 3 → 2** (4 toques); no segundo **1** mantém-se um beep sintético curto (`playBeepCountdownTick`). |
| **Round** | Um toque ao entrar nos **últimos 10 s** do round; de seguida, nos **últimos 5 s**, um bip por segundo **5 → 4 → 3 → 2** (4 toques). |
| **Descanso** | Nos **últimos 5 s** do descanso, mesma sequência **5 → 4 → 3 → 2** antes do próximo round. |

Vibração curta acompanha algumas transições (ver efeitos em `RoundTimerClient.tsx`).

## Interface (botões)

- Classe **`.round-timer-actions`**: agrupa Iniciar / Pausa / Continuar / Saltar fase / Repor; fundo `var(--bg-secondary)` e borda simples.  
- **`.round-timer-btn-primary`**: fundo sólido por fase (preparo / round / descanso / concluído) ou `var(--primary)` em idle; cantos `radius-md`, sombra leve, sem maiúsculas forçadas.  
- **`.round-timer-btn-secondary`**: fundo `var(--bg)`, borda `var(--border)`, hover com leve realce da cor da fase.  
- **`.round-timer-btn.text-sm`**: variantes compactas (ecrã inteiro, expandir config, guardar preset).  
- **`prefers-reduced-motion`:** reduz animações de hover/active.

## Persistência local

Chaves em `lib/round-timer/persistence.ts`: config, presets personalizados, snapshot da sessão activa (para refresh ou voltar ao separador).

## Testes do motor

`lib/round-timer/engine.test.ts` (Vitest) — transições round/rest/finished, último round sem descanso, etc.

## Referência cruzada

- Contexto breve no [`memory.md`](memory.md).  
- Painel coach: [`ESPECIFICACAO_DASHBOARD_COACH.md`](ESPECIFICACAO_DASHBOARD_COACH.md).  
- Índice geral: [`INDEX.md`](INDEX.md).
