import { notFound, redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminGoalDetail } from "../actions";
import { AdminGoalDetailClient } from "./AdminGoalDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function AdminMetaDetailPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const { id } = await params;
  const { goal, entries } = await getAdminGoalDetail(id);
  if (!goal) notFound();

  const { data: schools } = await result.client.from("School").select("id, name").order("name");

  return <AdminGoalDetailClient goal={goal} entries={entries} schools={schools ?? []} />;
}
