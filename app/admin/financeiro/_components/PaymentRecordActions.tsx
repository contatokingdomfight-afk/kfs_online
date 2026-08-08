"use client";

import { useRef, useState } from "react";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { ConfirmModal } from "@/components/ConfirmModalDynamic";
import { deleteAdminPayment } from "../actions";

type Props = {
  paymentIds: string[];
  deleteLabel: string;
  deletingLabel: string;
  deleteConfirm: string;
  confirmTitle: string;
  cancelLabel: string;
  editLabel?: string;
  onEdit?: () => void;
};

export function PaymentRecordActions({
  paymentIds,
  deleteLabel,
  deletingLabel,
  deleteConfirm,
  confirmTitle,
  cancelLabel,
  editLabel,
  onEdit,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (paymentIds.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
      {onEdit && editLabel ? (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: 13, padding: "6px 14px", flex: "1 1 auto", minWidth: 0 }}
          onClick={onEdit}
        >
          {editLabel}
        </button>
      ) : null}
      <form ref={formRef} action={deleteAdminPayment} style={{ margin: 0, flex: "1 1 auto", minWidth: 0 }}>
        <FormLoadingModal message={deletingLabel} />
        <input type="hidden" name="paymentIds" value={paymentIds.join(",")} />
        <button
          type="button"
          className="btn"
          style={{ fontSize: 13, padding: "6px 14px", width: "100%" }}
          onClick={() => setConfirmOpen(true)}
        >
          {deleteLabel}
        </button>
      </form>
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          formRef.current?.requestSubmit();
        }}
        title={confirmTitle}
        message={deleteConfirm}
        confirmLabel={deleteLabel}
        cancelLabel={cancelLabel}
        variant="danger"
      />
    </div>
  );
}
