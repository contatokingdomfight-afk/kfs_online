"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { moderateCoachTestimonial } from "../actions";

export function TestimonialModerationActions({ testimonialId }: { testimonialId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const decide = (decision: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("testimonialId", testimonialId);
      formData.set("decision", decision);
      await moderateCoachTestimonial(null, formData);
      router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <button type="button" className="btn btn-primary" disabled={pending} onClick={() => decide("APPROVED")} style={{ fontSize: 13, padding: "6px 12px" }}>
        Aprovar
      </button>
      <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => decide("REJECTED")} style={{ fontSize: 13, padding: "6px 12px" }}>
        Rejeitar
      </button>
    </div>
  );
}
