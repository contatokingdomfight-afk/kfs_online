import { Suspense } from "react";
import { SignInForm } from "./SignInForm";
import SignInLoading from "./loading";

/**
 * Página estática (sem cookies no servidor) para não gastar CPU na Vercel em cada visita.
 * A língua é lida no browser pelo SignInForm.
 */
export function generateStaticParams() {
  return [{ "sign-in": [] }];
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInForm />
    </Suspense>
  );
}
