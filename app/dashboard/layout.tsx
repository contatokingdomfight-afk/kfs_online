import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-bg-secondary px-4 py-3">
        <h1 className="text-lg font-semibold text-text-primary">
          Kingdom Fight School
        </h1>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
