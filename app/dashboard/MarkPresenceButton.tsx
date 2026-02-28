"use client";

import { useFormState } from "react-dom";
import { markPresence } from "./actions";

type Props = { lessonId: string };

export function MarkPresenceButton({ lessonId }: Props) {
  const [state, formAction] = useFormState(
    async (_: unknown, formData: FormData) => {
      const lid = formData.get("lessonId") as string;
      return lid ? await markPresence(lid) : {};
    },
    null as { error?: string } | null
  );

  return (
    <form action={formAction} style={{ marginTop: "clamp(10px, 2.5vw, 12px)" }}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <button
        type="submit"
        style={{
          fontSize: "clamp(15px, 3.8vw, 17px)",
          fontWeight: 600,
          minHeight: "clamp(44px, 11vw, 50px)",
          padding: "0.7em 1.3em",
          border: "1px solid rgba(255,255,255,0.9)",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          backgroundColor: "transparent",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        Marcar presença
      </button>
      {state?.error && (
        <span style={{ display: "block", marginTop: 8, fontSize: "clamp(13px, 3.2vw, 15px)", color: "rgba(255,255,255,0.95)" }}>
          {state.error}
        </span>
      )}
    </form>
  );
}
