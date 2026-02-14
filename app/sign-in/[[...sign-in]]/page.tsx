import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-4">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#c1121f",
            colorBackground: "var(--bg-secondary)",
            colorText: "var(--text-primary)",
            colorTextSecondary: "var(--text-secondary)",
          },
        }}
      />
    </main>
  );
}
