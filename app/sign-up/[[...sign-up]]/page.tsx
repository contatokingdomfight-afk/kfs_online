import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-4">
      <SignUp
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
