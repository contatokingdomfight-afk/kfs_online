"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { searchStudentsForPayment, type StudentPaymentRow } from "../actions";

/** «Registar outro aluno»: procura e abre o registo de pagamento já preenchido. */
export function FindStudentToPay({ referenceMonth }: { referenceMonth: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentPaymentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function search(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await searchStudentsForPayment(query, referenceMonth);
      if ("error" in res) {
        setError(res.error);
        setResults(null);
      } else {
        setError(res.results.length ? null : "Nenhum aluno encontrado.");
        setResults(res.results);
      }
    });
  }

  return (
    <div style={{ flex: "1 1 260px", minWidth: 0, position: "relative" }}>
      <form onSubmit={search} role="search" style={{ position: "relative" }}>
        <Search size={17} aria-hidden style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
        <input
          type="search"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Registar outro aluno…"
          aria-label="Procurar aluno para registar pagamento"
          style={{ width: "100%", paddingLeft: 38, minHeight: 42 }}
        />
      </form>
      {pending ? <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>A procurar…</p> : null}
      {error ? <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{error}</p> : null}
      {results && results.length > 0 ? (
        <ul className="card" style={{ listStyle: "none", margin: "6px 0 0", padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
          {results.slice(0, 8).map((r) => (
            <li key={r.studentId}>
              <Link
                href={`/admin/financeiro/novo?studentId=${encodeURIComponent(r.studentId)}&referenceMonth=${referenceMonth}`}
                style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderRadius: 8, textDecoration: "none", color: "var(--text-primary)" }}
              >
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <strong>{r.name || r.email}</strong>
                  {r.planName ? <span style={{ color: "var(--text-secondary)", fontSize: 13 }}> · {r.planName}</span> : null}
                </span>
                <span style={{ fontSize: 12, color: r.existingPayment?.status === "PAID" ? "#16a34a" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {r.existingPayment?.status === "PAID" ? "já pago" : "registar →"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
