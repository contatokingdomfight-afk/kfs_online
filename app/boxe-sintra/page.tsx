import { ModalidadeLandingTemplate, generateModalidadeLandingMetadata } from "@/components/modalidades/ModalidadeLandingTemplate";

export function generateMetadata() {
  return generateModalidadeLandingMetadata("boxe");
}

export default function BoxeSintraPage() {
  return <ModalidadeLandingTemplate slug="boxe" />;
}
