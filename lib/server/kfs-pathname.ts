import { headers } from "next/headers";

/** Definido em `middleware` (`x-kfs-pathname`); usado no servidor para restringir admin granular. */
export async function getKfsPathnameFromRequest(): Promise<string | null> {
  const h = await headers();
  return h.get("x-kfs-pathname");
}
