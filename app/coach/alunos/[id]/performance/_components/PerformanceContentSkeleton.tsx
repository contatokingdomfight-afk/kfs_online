export function PerformanceContentSkeleton() {
  return (
    <div className="max-w-[min(720px,100%)] mx-auto space-y-6 pb-8">
      <div className="rounded-2xl bg-bg-secondary border border-border p-6 shadow-md">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div style={{ height: 32, width: 120, borderRadius: 4, backgroundColor: "var(--border)" }} />
          <div style={{ height: 48, width: 48, borderRadius: "50%", backgroundColor: "var(--surface)" }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: 80, borderRadius: 8, backgroundColor: "var(--surface)" }} />
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-bg-secondary border border-border p-6 shadow-md">
        <div style={{ height: 24, width: "40%", marginBottom: 16, borderRadius: 4, backgroundColor: "var(--border)" }} />
        <div
          style={{
            width: 200,
            height: 200,
            margin: "0 auto",
            borderRadius: "50%",
            backgroundColor: "var(--surface)",
          }}
        />
      </div>
      <div className="rounded-2xl bg-bg-secondary border border-border p-6 shadow-md">
        <div style={{ height: 24, width: "50%", marginBottom: 12, borderRadius: 4, backgroundColor: "var(--border)" }} />
        <div style={{ height: 60, width: "100%", borderRadius: 8, backgroundColor: "var(--surface)" }} />
      </div>
    </div>
  );
}
