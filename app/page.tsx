import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg p-6 flex flex-col items-center justify-center">
      <h1 className="text-xl font-semibold text-text-primary mb-2">
        Kingdom Fight School
      </h1>
      <p className="text-sm text-text-secondary mb-6 text-center">
        Plataforma de gestão e ensino
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/sign-in"
          className="rounded-md bg-primary px-4 py-3 text-center text-sm font-medium text-white hover:opacity-90"
        >
          Entrar
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md border border-border bg-bg-secondary px-4 py-3 text-center text-sm font-medium text-text-primary"
        >
          Criar conta
        </Link>
      </div>
    </main>
  );
}
