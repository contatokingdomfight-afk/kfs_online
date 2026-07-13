import { redirect } from "next/navigation";

/** Legado: /julgamento → /arbitragem */
export default function JulgamentoRedirectPage() {
  redirect("/arbitragem");
}
