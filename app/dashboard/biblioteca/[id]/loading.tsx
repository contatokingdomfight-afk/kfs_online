import { getTranslations } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";

export default async function CursoLoading() {
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 280,
        gap: 16,
      }}
    >
      <div
        role="progressbar"
        aria-valuetext="Abrindo curso…"
        style={{
          width: 48,
          height: 48,
          border: "3px solid var(--border)",
          borderTopColor: "var(--primary)",
          borderRadius: "50%",
          animation: "curso-loading-spin 0.8s linear infinite",
        }}
      />
      <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontWeight: 500 }}>
        {t("openingCourse")}
      </p>
      <div
        style={{
          width: "min(200px, 80%)",
          height: 4,
          borderRadius: 2,
          backgroundColor: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "40%",
            backgroundColor: "var(--primary)",
            animation: "curso-loading-bar 1.2s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes curso-loading-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes curso-loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
