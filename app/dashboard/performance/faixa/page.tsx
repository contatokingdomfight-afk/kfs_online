import { redirect } from "next/navigation";

/** A faixa por XP deu lugar ao nível geral numérico (lib/levels.ts); o detalhe do XP está no Ranking. */
export default function FaixaPage() {
  redirect("/dashboard/rank");
}
