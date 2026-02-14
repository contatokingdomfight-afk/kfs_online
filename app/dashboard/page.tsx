import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();

  return (
    <div>
      <p className="text-text-secondary text-sm mb-4">
        Área restrita. User ID: {userId?.slice(0, 12)}…
      </p>
      <p className="text-text-primary">
        Em breve: Home por perfil (Aluno / Coach / Admin).
      </p>
    </div>
  );
}
