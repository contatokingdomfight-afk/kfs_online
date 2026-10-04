import Link from "next/link";
import type { Metadata } from "next";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCoachPublicProfileData } from "@/lib/coach-public-profile";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getPublicOrigin } from "@/lib/site-public-url";

type Props = { params: Promise<{ coachId: string }> };

const COPY = {
  pt: {
    fallbackTitle: "Perfil de Treinador",
    fallbackDescription: "Conhece os treinadores da Kingdom Fight School.",
    unavailable: "Este perfil não está disponível.",
    backHome: "Início",
    trialCta: "Marcar aula experimental",
    specialties: "Especialidades",
    schools: "Leciona em",
    currentStudents: "alunos atuais",
    lessonsTaught: "aulas lecionadas",
    memberSince: "Na Kingdom desde",
    yearsExperience: (n: number) => `${n} ${n === 1 ? "ano" : "anos"} de experiência`,
    testimonialsTitle: "O que dizem os alunos",
    noTestimonials: "Ainda sem depoimentos públicos.",
    ratingOutOf: "de 5",
  },
  en: {
    fallbackTitle: "Coach Profile",
    fallbackDescription: "Meet the Kingdom Fight School coaches.",
    unavailable: "This profile is not available.",
    backHome: "Home",
    trialCta: "Book a trial class",
    specialties: "Specialties",
    schools: "Teaches at",
    currentStudents: "current students",
    lessonsTaught: "classes taught",
    memberSince: "At Kingdom since",
    yearsExperience: (n: number) => `${n} ${n === 1 ? "year" : "years"} of experience`,
    testimonialsTitle: "What students say",
    noTestimonials: "No public testimonials yet.",
    ratingOutOf: "out of 5",
  },
} as const;

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-hidden style={{ color: "var(--primary)", letterSpacing: 1 }}>
      {"★".repeat(Math.round(rating))}
      {"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { coachId } = await params;
  const base = getPublicOrigin();
  const locale = ((await getLocaleFromCookies()) === "en" ? "en" : "pt") as "pt" | "en";
  const copy = COPY[locale];

  const admin = getAdminClientOrNull();
  let title: string = copy.fallbackTitle;
  let description: string = copy.fallbackDescription;
  if (admin.client) {
    const result = await getCoachPublicProfileData(admin.client, coachId);
    if (result.ok) {
      title = `${result.data.name} · Kingdom Fight School`;
      description = result.data.bio?.slice(0, 160) || copy.fallbackDescription;
    }
  }

  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: { canonical: `/t/c/${coachId}` },
    openGraph: { title, description, url: `${base}/t/c/${coachId}`, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

export default async function CoachPublicProfilePage({ params }: Props) {
  const { coachId } = await params;
  const locale = ((await getLocaleFromCookies()) === "en" ? "en" : "pt") as "pt" | "en";
  const copy = COPY[locale];
  const admin = getAdminClientOrNull();

  const result = admin.client
    ? await getCoachPublicProfileData(admin.client, coachId)
    : { ok: false as const, reason: "not_found" as const };

  if (!result.ok) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-md rounded-2xl p-6 text-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>{copy.unavailable}</p>
          <Link href="/" className="btn btn-secondary">
            ← {copy.backHome}
          </Link>
        </div>
      </main>
    );
  }

  const { data } = result;

  return (
    <main className="min-h-screen flex flex-col items-center p-6" style={{ background: "var(--bg)", paddingTop: "clamp(24px, 6vw, 48px)", paddingBottom: "clamp(48px, 10vw, 80px)" }}>
      <div className="w-full max-w-lg">
        <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 14 }}>
          ← {copy.backHome}
        </Link>

        <div
          className="mt-4 rounded-2xl p-6 text-center"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          {data.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.avatarUrl}
              alt={data.name}
              style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", margin: "0 auto 14px" }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                margin: "0 auto 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--primary)",
                color: "#fff",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {initialsFromName(data.name)}
            </div>
          )}

          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{data.name}</h1>

          {data.beltName ? (
            <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>Faixa {data.beltName}</p>
          ) : null}

          {data.yearsExperience ? (
            <p style={{ margin: "0 0 2px", fontSize: 13, color: "var(--text-secondary)" }}>
              {copy.yearsExperience(data.yearsExperience)}
            </p>
          ) : null}

          {data.memberSinceLabel ? (
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)" }}>
              {copy.memberSince} {data.memberSinceLabel}
            </p>
          ) : null}

          {data.bio ? (
            <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)", textAlign: "left" }}>
              {data.bio}
            </p>
          ) : null}

          {data.specialties.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 14 }}>
              {data.specialties.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}

          {data.schoolNames.length > 0 ? (
            <p style={{ margin: "14px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
              {copy.schools}: {data.schoolNames.join(", ")}
            </p>
          ) : null}

          {(data.instagramHandle || data.facebookUrl) && (
            <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 14 }}>
              {data.instagramHandle ? (
                <a
                  href={`https://instagram.com/${data.instagramHandle.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}
                >
                  Instagram
                </a>
              ) : null}
              {data.facebookUrl ? (
                <a
                  href={data.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}
                >
                  Facebook
                </a>
              ) : null}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{data.currentStudentCount}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{copy.currentStudents}</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{data.lessonsTaughtCount}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{copy.lessonsTaught}</div>
            </div>
          </div>

          <Link href="/aula-experimental" className="btn btn-primary w-full" style={{ marginTop: 20, textDecoration: "none", display: "block" }}>
            {copy.trialCta}
          </Link>
        </div>

        <div className="mt-5 rounded-2xl p-6" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            {copy.testimonialsTitle}
          </h2>
          {data.averageRating ? (
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-secondary)" }}>
              <Stars rating={data.averageRating} /> {data.averageRating} {copy.ratingOutOf} · {data.testimonials.length}
            </p>
          ) : (
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{copy.noTestimonials}</p>
          )}
          {data.testimonials.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
              {data.testimonials.map((t) => (
                <div key={t.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <Stars rating={t.rating} />
                  <p style={{ margin: "6px 0 4px", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5 }}>{t.body}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{t.studentFirstName}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
