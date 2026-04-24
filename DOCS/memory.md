# Memória do projeto

A documentação **canónica** de contexto (arquitetura, entregas recentes, sessão, etc.) está em:

**[`DOCS/memory.md`](../DOCS/memory.md)**

Edita sempre **`DOCS/memory.md`** (pasta `DOCS/` em maiúsculas), não este ficheiro, para evitar duplicados.

## Performance (área do aluno)

- Na performance (aluno e vista coach do aluno), o carrossel radar + silhueta tem **sempre** 2.º painel: silhueta **personalizada** com ≥2 circunferências na ficha; **neutra** com ficha sem medidas suficientes; **neutra + texto «sem ficha»** só se `getAchievementUnlockContext` também não encontrar ficha. Se a plataforma indica ficha mas a query com `formData` falhar, texto de «detalhes não carregaram». Helper: `lib/build-performance-physical-carousel.ts`. Texto de swipe sob o carrossel omitido quando vazio. Ao gravar ficha: `revalidatePath('/dashboard/performance')`.
- **Aluno — ver ficha:** `/dashboard/ficha-fisica` (só leitura, última `StudentPhysicalAssessment`). Menu «Ficha física». Link «Ver ficha completa» sob o carrossel na performance. `hasAnamnesisOrNonAnthroAssessmentContent` em `lib/physical-assessment-content-flags.ts` distingue anamnese preenchida sem secção 6.4 para copy do 2.º painel. **Escala da silhueta:** altura/peso em `StudentProfile` + `computeGlobalBodyScale` em `lib/illustrative-body-silhouette.ts` (ilustrativo).

## Ficha de anamnese e avaliação física (coach)

- **Insert Supabase:** `savePhysicalAssessment` envia `id` (UUID) em cada linha de `StudentPhysicalAssessment`; a migração `supabase/migrations/20260422120000_student_physical_assessment_id_default.sql` define `DEFAULT` na coluna `id` para ambientes onde o insert omitia a PK (evita erro NOT NULL).
- **6.4 em `formData`:** largura biaquatorial (ombros), comprimento braço ombro→ponta do dedo (esq./dir.), entrepé perna (esq./dir.), circunferência bíceps (esq./dir.), circunferência antebraço (esq./dir.), circunferência do tórax; tipos em `lib/physical-assessment-types.ts`, leitura em `avaliacao-fisica/actions.ts`, só leitura em `PhysicalAssessmentReadOnlyView.tsx`. `hasIllustrativeAnthropometry` (`lib/illustrative-body-silhouette.ts`) conta também estes valores para o mínimo de medidas da silhueta; o avatar (`components/avatar/`) usa medida direta de ombros (se existir), tórax e entrepé como ajuste ilustrativo de torso e perna.
- **UI:** formulário em `AvaliacaoFisicaForm.tsx` com grelhas e rótulos empilhados no desktop; página `avaliacao-fisica/page.tsx` com largura máxima maior em `xl`/`2xl`.
- **Notificação ao aluno:** após guardar com sucesso, `notifyStudentOfNewPhysicalAssessment` em `lib/notifications/in-app.ts` cria linha em `Notification` (tipo `PHYSICAL_ASSESSMENT`, link `/dashboard/ficha-fisica`); `revalidatePath` inclui `/dashboard` e `/dashboard/notificacoes`.
- **Avatar ilustrativo:** `components/avatar/` — pernas com espessura mínima e afastamento em px (não usar stroke como coordenada); `poseTag` `auto` (guarda por modalidade) ou `star` (braços e pernas abertos); chips opcionais `showPoseTags` no carrossel de performance. Equipamento: luvas (boxing), wraps (muay_thai), nada (bjj). `IllustrativeBodyAvatar` + `lib/illustrative-body-silhouette.ts` (gating / JSON). Escala de ombros no SVG: com `breadthShoulderCm` na ficha, `mapFormDataToAvatarMeasurements` marca `shouldersAreBiacromialCm` e `buildBodyScaleFactors` usa ref ~41 cm; estimativas pescoço/tórax mantêm ref ~112 cm (evita factor no chão quando a medida é biaquatorial).
