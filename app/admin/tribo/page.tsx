import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCachedSchools } from "@/lib/cached-reference-data";
import { AdminSchoolFilter } from "@/app/admin/AdminSchoolFilter";
import { TribeAdminPostRow } from "./TribeAdminPostRow";

type SearchParams = Promise<{ school?: string; status?: string }>;

const STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "ACTIVE", label: "Ativas" },
  { value: "HIDDEN", label: "Ocultas" },
  { value: "DELETED", label: "Apagadas" },
] as const;

export default async function AdminTriboPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const schoolId = params.school?.trim() || null;
  const status = params.status?.trim() || "all";

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const schools = await getCachedSchools(supabase);

  let query = supabase
    .from("TribePost")
    .select("id, schoolId, authorUserId, body, visibility, status, createdAt, hiddenAt, hiddenByUserId")
    .order("createdAt", { ascending: false })
    .limit(100);
  if (schoolId) query = query.eq("schoolId", schoolId);
  if (status !== "all") query = query.eq("status", status);

  const { data: rawPosts } = await query;
  const posts = rawPosts ?? [];

  const postIds = posts.map((p) => p.id as string);
  const authorIds = [...new Set(posts.map((p) => p.authorUserId as string))];
  const hiddenByIds = [...new Set(posts.map((p) => p.hiddenByUserId as string | null).filter((x): x is string => !!x))];
  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

  const [{ data: mediaRows }, { data: likeRows }, { data: commentRows }, { data: users }] = await Promise.all([
    postIds.length
      ? supabase.from("TribePostMedia").select("id, postId, publicUrl, mimeType").in("postId", postIds)
      : Promise.resolve({ data: [] }),
    postIds.length ? supabase.from("TribeLike").select("postId").in("postId", postIds) : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from("TribeComment").select("id, postId").in("postId", postIds)
      : Promise.resolve({ data: [] }),
    [...authorIds, ...hiddenByIds].length
      ? supabase.from("User").select("id, name, email").in("id", [...new Set([...authorIds, ...hiddenByIds])])
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id as string, (u.name as string | null) ?? (u.email as string)]));

  const mediaByPost = new Map<string, { id: string; publicUrl: string; mimeType: string }[]>();
  for (const m of mediaRows ?? []) {
    const row = m as { id: string; postId: string; publicUrl: string; mimeType: string };
    const list = mediaByPost.get(row.postId) ?? [];
    list.push(row);
    mediaByPost.set(row.postId, list);
  }
  const likeCountByPost = new Map<string, number>();
  for (const l of likeRows ?? []) {
    const pid = (l as { postId: string }).postId;
    likeCountByPost.set(pid, (likeCountByPost.get(pid) ?? 0) + 1);
  }
  const commentCountByPost = new Map<string, number>();
  for (const c of commentRows ?? []) {
    const pid = (c as { postId: string }).postId;
    commentCountByPost.set(pid, (commentCountByPost.get(pid) ?? 0) + 1);
  }

  return (
    <div style={{ maxWidth: "min(820px, 100%)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 16px)",
          marginBottom: "clamp(20px, 5vw, 24px)",
        }}
      >
        <Link
          href="/admin"
          style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500 }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Tribo — Moderação
        </h1>
      </div>

      <div style={{ marginBottom: "clamp(16px, 4vw, 20px)", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <AdminSchoolFilter schools={schools} currentSchoolId={schoolId} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STATUS_FILTERS.map((f) => {
            const qs = new URLSearchParams();
            if (schoolId) qs.set("school", schoolId);
            if (f.value !== "all") qs.set("status", f.value);
            const href = `/admin/tribo${qs.toString() ? `?${qs.toString()}` : ""}`;
            return (
              <Link
                key={f.value}
                href={href}
                className="btn"
                style={{
                  textDecoration: "none",
                  backgroundColor: status === f.value ? "var(--primary)" : "var(--bg-secondary)",
                  color: status === f.value ? "#fff" : "var(--text-primary)",
                }}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      {posts.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Nenhuma publicação com este filtro.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {posts.map((p) => (
            <TribeAdminPostRow
              key={p.id as string}
              post={{
                id: p.id as string,
                schoolId: p.schoolId as string,
                authorUserId: p.authorUserId as string,
                body: p.body as string,
                visibility: p.visibility as string,
                status: p.status as string,
                createdAt: p.createdAt as string,
                hiddenAt: p.hiddenAt as string | null,
                hiddenByUserId: p.hiddenByUserId as string | null,
              }}
              authorName={userMap.get(p.authorUserId as string) ?? p.authorUserId as string}
              hiddenByName={p.hiddenByUserId ? userMap.get(p.hiddenByUserId as string) ?? null : null}
              schoolName={schoolMap.get(p.schoolId as string) ?? p.schoolId as string}
              media={mediaByPost.get(p.id as string) ?? []}
              likeCount={likeCountByPost.get(p.id as string) ?? 0}
              commentCount={commentCountByPost.get(p.id as string) ?? 0}
              userMap={Object.fromEntries(userMap)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
