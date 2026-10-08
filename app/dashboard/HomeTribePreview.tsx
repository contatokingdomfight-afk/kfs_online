import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { getTribeStudentWriteContext } from "@/lib/tribe/student-context";
import { loadTribeFeed } from "@/lib/tribe/feed";

function initialsOf(name: string | null): string {
  return (
    (name ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function timeAgo(iso: string, pt: boolean): string {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 60) return pt ? `há ${Math.max(1, diffMin)} min` : `${Math.max(1, diffMin)} min ago`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return pt ? `há ${h} h` : `${h} h ago`;
  const d = Math.round(h / 24);
  return pt ? `há ${d} ${d === 1 ? "dia" : "dias"}` : `${d} ${d === 1 ? "day" : "days"} ago`;
}

/** «Na tribo» na página inicial: as 2 publicações mais recentes da Tribo da escola. */
export async function HomeTribePreview({ locale }: { locale: "pt" | "en" }) {
  const pt = locale === "pt";
  const gate = await getTribeStudentWriteContext().catch(() => null);
  if (!gate || !gate.ok) return null;
  const posts = await loadTribeFeed(gate.ctx, 2).catch(() => []);
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="home-tribe" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 id="home-tribe" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
          {pt ? "Na tribo" : "In the tribe"}
        </h2>
        <Link href="/dashboard/tribo" style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
          {pt ? "Ver tudo" : "See all"}
        </Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 10 }}>
        {posts.map((p) => {
          const photo = p.media.find((m) => m.mimeType.startsWith("image/"))?.publicUrl ?? null;
          return (
            <Link
              key={p.id}
              href={`/dashboard/tribo?post=${encodeURIComponent(p.id)}`}
              className="card"
              style={{ padding: 12, display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- foto do Supabase Storage
                <img src={photo} alt="" loading="lazy" style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 12, objectFit: "cover" }} />
              ) : p.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar do Supabase Storage
                <img src={p.author.avatarUrl} alt="" loading="lazy" style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <span
                  aria-hidden
                  style={{
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    borderRadius: "50%",
                    backgroundColor: "var(--primary)",
                    color: "#fff",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {initialsOf(p.author.name)}
                </span>
              )}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>{p.author.name ?? (pt ? "Membro da Tribo" : "Tribe member")}</strong> ·{" "}
                  {timeAgo(p.createdAt, pt)}
                </span>
                {p.body?.trim() ? (
                  <span
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      fontSize: 14,
                      lineHeight: 1.4,
                      marginTop: 2,
                    }}
                  >
                    {p.body}
                  </span>
                ) : null}
                <span style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: p.likedByMe ? "var(--primary)" : undefined }}>
                    <Heart size={13} aria-hidden fill={p.likedByMe ? "currentColor" : "none"} />
                    {p.likeCount}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <MessageCircle size={13} aria-hidden />
                    {p.commentCount}
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
