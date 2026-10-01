import { ModalidadeLandingTemplate, generateModalidadeLandingMetadata } from "@/components/modalidades/ModalidadeLandingTemplate";

export function generateMetadata() {
  return generateModalidadeLandingMetadata("mma");
}

export default function MmaSintraPage() {
  return <ModalidadeLandingTemplate slug="mma" />;
}
