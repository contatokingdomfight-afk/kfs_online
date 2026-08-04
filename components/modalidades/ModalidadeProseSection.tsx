type Props = {
  title: string;
  text: string;
  border?: boolean;
};

export function ModalidadeProseSection({ title, text, border = true }: Props) {
  return (
    <section className={`py-16 sm:py-20 ${border ? "border-t border-[var(--border)]" : ""}`}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{title}</h2>
        <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">{text}</p>
      </div>
    </section>
  );
}
