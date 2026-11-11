import type { Metadata } from "next";
import { HomePageView } from "@/components/home/HomePageView";

/**
 * Página inicial (PT). Quem tem o cookie de língua «en» é reescrito para /en pelo middleware.
 * Estática (servida pela CDN, sem CPU por visita). Os dados renovam-se ao guardar planos, horários
 * ou posts da Tribo (revalidatePath) e, no máximo, de hora a hora. O `?code=` do OAuth é tratado no middleware.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Kingdom Fight School | Treine com Propósito. Lute com Disciplina.",
  description:
    "Escola de artes marciais com base em valores cristãos, em Algueirão-Mem Martins, Sintra. Muay Thai, Boxe, Kickboxing. Metodologia estruturada, treinadores experientes.",
  keywords: [
    "artes marciais Sintra",
    "Muay Thai Sintra",
    "Boxe Sintra",
    "Kickboxing Sintra",
    "Kingdom Fight",
    "Algueirão-Mem Martins",
    "escola de luta",
  ],
  openGraph: {
    title: "Kingdom Fight School | Treine com Propósito. Lute com Disciplina.",
    description:
      "Escola de artes marciais com base em valores cristãos. Metodologia estruturada, treinadores experientes.",
    type: "website",
  },
};

export default function HomePage() {
  return <HomePageView locale="pt" />;
}
