"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type SchoolOption = { id: string; name: string };

type Props = {
  schools: SchoolOption[];
};

export function AdminGoalsFilters({ schools }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const school = searchParams.get("school") ?? "";
  const status = searchParams.get("status") ?? "ALL";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") params.set(key, value);
    else params.delete(key);
    router.push(`/admin/metas?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        <span style={{ fontWeight: 500 }}>Escola</span>
        <select className="input" value={school} onChange={(e) => update("school", e.target.value)} style={{ minWidth: 160 }}>
          <option value="">Todas</option>
          <option value="global">Global</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        <span style={{ fontWeight: 500 }}>Estado</span>
        <select className="input" value={status} onChange={(e) => update("status", e.target.value)} style={{ minWidth: 140 }}>
          <option value="ALL">Todas</option>
          <option value="ACTIVE">Activas</option>
          <option value="OVERDUE">Em atraso</option>
          <option value="COMPLETED">Concluídas</option>
          <option value="CANCELLED">Canceladas</option>
        </select>
      </label>
      {(school || (status && status !== "ALL")) && (
        <Link href="/admin/metas" style={{ fontSize: 14, color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
          Limpar filtros
        </Link>
      )}
    </div>
  );
}
