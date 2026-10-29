"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSelectedSchool } from "@/lib/school-scope-actions";

type Props = {
  schools: { id: string; name: string }[];
  selectedSchoolId: string | null;
  /** Admin Geral: mostra «Todas as escolas». */
  allowAll: boolean;
};

/** Seletor de escola no topo do backoffice (Admin Geral, ou staff com mais de uma escola). */
export function SchoolPicker({ schools, selectedSchoolId, allowAll }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    startTransition(async () => {
      await setSelectedSchool(value);
      router.refresh();
    });
  }

  return (
    <select
      aria-label="Escola"
      value={selectedSchoolId ?? ""}
      onChange={handleChange}
      disabled={pending}
      style={{
        maxWidth: 220,
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-primary)",
        fontSize: 13,
        fontWeight: 600,
        opacity: pending ? 0.6 : 1,
      }}
    >
      {allowAll ? <option value="">Todas as escolas</option> : null}
      {schools.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

/** Diretor/coach com uma só escola: etiqueta fixa, sem seletor. */
export function SchoolBadge({ name }: { name: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(34,197,94,.13)",
        color: "var(--success, #22c55e)",
        whiteSpace: "nowrap",
      }}
    >
      ● {name}
    </span>
  );
}
