"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { RankAgeBucket } from "@/lib/rank-filters";
import { RANK_AGE_BUCKETS, RANK_MODALITY_FILTER_CODES } from "@/lib/rank-filters";

type SchoolOption = { id: string; name: string };

type Messages = {
  filterSchool: string;
  filterModality: string;
  filterAge: string;
  filterAll: string;
  filterReset: string;
  filterLoading: string;
  ageKids: string;
  ageTeens: string;
  ageAdults: string;
  ageMasters: string;
  modalityMuay: string;
  modalityBoxing: string;
  modalityKick: string;
  modalityMma: string;
};

function modalityLabel(code: string, m: Messages): string {
  switch (code) {
    case "MUAY_THAI":
      return m.modalityMuay;
    case "BOXING":
      return m.modalityBoxing;
    case "KICKBOXING":
      return m.modalityKick;
    case "MMA":
      return m.modalityMma;
    default:
      return code;
  }
}

function ageLabel(bucket: RankAgeBucket, m: Messages): string {
  switch (bucket) {
    case "KIDS":
      return m.ageKids;
    case "TEENS":
      return m.ageTeens;
    case "ADULTS":
      return m.ageAdults;
    case "MASTERS":
      return m.ageMasters;
    default:
      return bucket;
  }
}

type Props = {
  schools: SchoolOption[];
  defaultSchoolId: string;
  currentSchoolId: string;
  currentModality: string | null;
  currentAge: RankAgeBucket | null;
  messages: Messages;
};

export function RankFiltersForm({
  schools,
  defaultSchoolId,
  currentSchoolId,
  currentModality,
  currentAge,
  messages: m,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function buildQuery(school: string, modality: string, age: string): string {
    const p = new URLSearchParams();
    if (school && school !== defaultSchoolId) p.set("school", school);
    if (modality) p.set("modality", modality);
    if (age) p.set("age", age);
    const q = p.toString();
    return q ? `/dashboard/rank?${q}` : "/dashboard/rank";
  }

  function apply(school: string, modality: string, age: string) {
    startTransition(() => {
      router.push(buildQuery(school, modality, age));
    });
  }

  return (
    <div
      key={`${currentSchoolId}-${currentModality ?? ""}-${currentAge ?? ""}`}
      className="card p-4 mb-6 space-y-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[var(--text-primary)]">{m.filterSchool}</span>
          <select
            className="input w-full min-h-[40px]"
            name="school"
            defaultValue={currentSchoolId}
            disabled={pending}
            onChange={(e) =>
              apply(
                e.target.value,
                currentModality ?? "",
                currentAge ?? ""
              )
            }
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[var(--text-primary)]">{m.filterModality}</span>
          <select
            className="input w-full min-h-[40px]"
            defaultValue={currentModality ?? ""}
            disabled={pending}
            onChange={(e) =>
              apply(currentSchoolId, e.target.value, currentAge ?? "")
            }
          >
            <option value="">{m.filterAll}</option>
            {RANK_MODALITY_FILTER_CODES.map((code) => (
              <option key={code} value={code}>
                {modalityLabel(code, m)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[var(--text-primary)]">{m.filterAge}</span>
          <select
            className="input w-full min-h-[40px]"
            defaultValue={currentAge ?? ""}
            disabled={pending}
            onChange={(e) =>
              apply(currentSchoolId, currentModality ?? "", e.target.value)
            }
          >
            <option value="">{m.filterAll}</option>
            {RANK_AGE_BUCKETS.map((bucket) => (
              <option key={bucket} value={bucket}>
                {ageLabel(bucket, m)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          className="btn-secondary text-sm py-2 px-3"
          disabled={pending}
          onClick={() => router.push("/dashboard/rank")}
        >
          {m.filterReset}
        </button>
        {pending && (
          <span className="text-xs text-[var(--text-secondary)]">{m.filterLoading}</span>
        )}
      </div>
    </div>
  );
}
