"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type SchoolOption = { id: string; name: string };

type Props = {
  schools: SchoolOption[];
  currentSchoolId: string | null;
};

export function AdminSchoolFilter({ schools, currentSchoolId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) next.set("school", value);
    else next.delete("school");
    router.push(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
  }

  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>Escola:</span>
      <select
        value={currentSchoolId ?? ""}
        onChange={handleChange}
        className="input"
        style={{ minWidth: 180, maxWidth: 280 }}
        aria-label="Filtrar por escola"
      >
        <option value="">Todas as escolas</option>
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
