"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  currentMonth: string;
  label: string;
};

export function MonthSelector({ currentMonth, label }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const month = e.target.value;
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    router.push(`?${params.toString()}`);
  }

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <input
        type="month"
        defaultValue={currentMonth}
        onChange={onChange}
        className="input"
        style={{ width: "auto" }}
        aria-label={label}
      />
    </label>
  );
}
