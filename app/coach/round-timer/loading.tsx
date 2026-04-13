export default function Loading() {
  return (
    <div className="max-w-[min(520px,100%)] mx-auto px-3 py-10 animate-pulse">
      <div className="h-8 w-40 rounded bg-[var(--bg-secondary)] mb-6" />
      <div className="h-24 w-full rounded-lg bg-[var(--bg-secondary)] mb-4" />
      <div className="h-12 w-full rounded-lg bg-[var(--bg-secondary)]" />
    </div>
  );
}
