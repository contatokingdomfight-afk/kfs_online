import { ModalidadeLandingTemplate, generateModalidadeLandingMetadata } from "@/components/modalidades/ModalidadeLandingTemplate";

export function generateMetadata() {
  return generateModalidadeLandingMetadata("muay-thai");
}

export default function MuayThaiSintraPage() {
  return <ModalidadeLandingTemplate slug="muay-thai" />;
}
