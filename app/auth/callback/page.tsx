import { Suspense } from "react";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { AuthCallbackClient } from "./AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-bg">
          <LoadingOverlay open message="A concluir login…" showSpinner />
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
