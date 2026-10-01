import { ModalidadeLandingTemplate, generateModalidadeLandingMetadata } from "@/components/modalidades/ModalidadeLandingTemplate";

export function generateMetadata() {
  return generateModalidadeLandingMetadata("kickboxing");
}

export default function KickboxingSintraPage() {
  return <ModalidadeLandingTemplate slug="kickboxing" />;
}
