import { notFound } from "next/navigation";
import DevSilhouettePlayground from "./DevSilhouettePlayground";

/** Playground interno; bloqueado em produção na Vercel (`middleware` + `notFound`). */
export default function DevSilhueta2DPage() {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }
  return <DevSilhouettePlayground />;
}
