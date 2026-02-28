"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setRegistrationStatus } from "../actions";

type Props = { registrationId: string };

export function ConfirmRegistrationButton({ registrationId }: Props) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setPending(true);
    await setRegistrationStatus(registrationId, "CONFIRMED");
    router.refresh();
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="btn btn-primary"
      style={{ marginLeft: "auto", minHeight: 36, fontSize: "clamp(13px, 3.2vw, 15px)" }}
    >
      {pending ? "…" : "Confirmar"}
    </button>
  );
}
