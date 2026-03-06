import Image from "next/image";

type Content = {
  foundersTitle: string;
  foundersSubtitle: string;
  foundersVideoTitle: string;
  foundersVideoUrl: string;
  founder1Name: string;
  founder1Role: string;
  founder1Image: string;
  founder1Bio?: string;
  founder2Name: string;
  founder2Role: string;
  founder2Image: string;
  founder2Bio?: string;
};

type FounderCardProps = {
  name: string;
  role: string;
  imageSrc?: string;
  bio?: string;
};

function FounderCard({ name, role, imageSrc, bio }: FounderCardProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center transition-all hover:border-[var(--primary)]/30">
      <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-2 border-[var(--border)]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={name}
            fill
            className="object-cover"
            sizes="128px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--primary)]/20 text-4xl font-bold text-[var(--primary)]">
            {name.charAt(0)}
          </div>
        )}
      </div>
      <h3 className="mt-4 font-semibold text-[var(--text-primary)]">{name}</h3>
      <p className="mt-1 text-sm font-medium text-[var(--primary)]">{role}</p>
      {bio && (
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {bio}
        </p>
      )}
    </div>
  );
}

export function Founders({ content }: { content: Content }) {
  const founders: FounderCardProps[] = [
    {
      name: content.founder1Name,
      role: content.founder1Role,
      imageSrc: content.founder1Image || undefined,
      bio: content.founder1Bio,
    },
    {
      name: content.founder2Name,
      role: content.founder2Role,
      imageSrc: content.founder2Image || undefined,
      bio: content.founder2Bio,
    },
  ];

  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          {content.foundersTitle}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-[var(--text-secondary)]">
          {content.foundersSubtitle}
        </p>

        {/* Vídeo - História da KFS */}
        <div className="mt-12">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
            <iframe
              src={content.foundersVideoUrl}
              title={content.foundersVideoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
            {content.foundersVideoTitle}
          </p>
        </div>

        {/* Cards dos fundadores */}
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {founders.map((founder, i) => (
            <FounderCard key={i} {...founder} />
          ))}
        </div>
      </div>
    </section>
  );
}
