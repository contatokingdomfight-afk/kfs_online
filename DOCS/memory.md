# Memória do projeto

A documentação **canónica** de contexto (arquitetura, entregas recentes, sessão, etc.) está em:

**[`DOCS/memory.md`](../DOCS/memory.md)**

Edita sempre **`DOCS/memory.md`** (pasta `DOCS/` em maiúsculas), não este ficheiro, para evitar duplicados.

## Performance (área do aluno)

- Na performance (aluno e vista coach do aluno), o carrossel radar + silhueta tem **sempre** 2.º painel: silhueta **personalizada** com ≥2 circunferências na ficha; **neutra** com ficha sem medidas suficientes; **neutra + texto «sem ficha»** se ainda não existir `StudentPhysicalAssessment` na plataforma. Helper: `lib/build-performance-physical-carousel.ts`. Ao gravar ficha: `revalidatePath('/dashboard/performance')`.
