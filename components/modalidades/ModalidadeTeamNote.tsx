/** Frase genérica e verdadeira sobre a equipa técnica — usada quando não há instrutor por modalidade confirmado. */
export function ModalidadeTeamNote({ text }: { text: string }) {
  return (
    <section className="border-t border-[var(--border)] py-12">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-base leading-relaxed text-[var(--text-secondary)]">{text}</p>
      </div>
    </section>
  );
}
