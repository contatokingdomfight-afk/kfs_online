# Memória do projeto

A documentação **canónica** de contexto (arquitetura, entregas recentes, sessão, etc.) está em:

**[`DOCS/memory.md`](../DOCS/memory.md)**

Edita sempre **`DOCS/memory.md`** (pasta `DOCS/` em maiúsculas), não este ficheiro, para evitar duplicados.

## Performance (área do aluno)

- Na performance (aluno e vista coach do aluno), o carrossel radar + silhueta tem **sempre** 2.º painel: silhueta **personalizada** com ≥2 circunferências na ficha; **neutra** com ficha sem medidas suficientes; **neutra + texto «sem ficha»** só se `getAchievementUnlockContext` também não encontrar ficha. Se a plataforma indica ficha mas a query com `formData` falhar, texto de «detalhes não carregaram». Helper: `lib/build-performance-physical-carousel.ts`. Texto de swipe sob o carrossel omitido quando vazio. Ao gravar ficha: `revalidatePath('/dashboard/performance')`.
- **Aluno — ver ficha:** `/dashboard/ficha-fisica` (só leitura, última `StudentPhysicalAssessment`). Menu «Ficha física». Link «Ver ficha completa» sob o carrossel na performance. `hasAnamnesisOrNonAnthroAssessmentContent` em `lib/physical-assessment-content-flags.ts` distingue anamnese preenchida sem secção 6.4 para copy do 2.º painel. **Escala da silhueta:** altura/peso em `StudentProfile` + `computeGlobalBodyScale` em `lib/illustrative-body-silhouette.ts` (ilustrativo).
