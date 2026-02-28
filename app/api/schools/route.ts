import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";

export async function GET() {
  const dbUser = await getCurrentDbUser();
  
  if (!dbUser || dbUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: schools, error } = await supabase
    .from("School")
    .select("id, name")
    .eq("isActive", true)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ schools: schools || [] });
}
