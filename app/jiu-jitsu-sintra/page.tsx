import { ModalidadeLandingTemplate, generateModalidadeLandingMetadata } from "@/components/modalidades/ModalidadeLandingTemplate";

export function generateMetadata() {
  return generateModalidadeLandingMetadata("jiu-jitsu");
}

export default function JiuJitsuSintraPage() {
  return <ModalidadeLandingTemplate slug="jiu-jitsu" />;
}
