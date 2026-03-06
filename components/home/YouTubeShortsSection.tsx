type Content = {
  youtubeShortsTitle: string;
  youtubeShortsSubtitle?: string;
};

const SHORTS_VIDEO_IDS = [
  "qotPbvcE2Zw",
  "1BqQqcN1xeE",
  "ni1-Oo45zGo",
  "ZG_n6m3eyv8",
];

export function YouTubeShortsSection({ content }: { content: Content }) {
  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          {content.youtubeShortsTitle}
        </h2>
        {content.youtubeShortsSubtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-center text-[var(--text-secondary)]">
            {content.youtubeShortsSubtitle}
          </p>
        )}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {SHORTS_VIDEO_IDS.map((id) => (
            <div
              key={id}
              className="relative w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]"
              style={{ aspectRatio: "9/16" }}
            >
              <iframe
                src={`https://www.youtube.com/embed/${id}`}
                title="YouTube Short"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
