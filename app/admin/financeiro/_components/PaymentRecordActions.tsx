"use client";

import { FormLoadingModal } from "@/components/FormLoadingModal";
import { deleteAdminPayment } from "../actions";

type Props = {
  paymentIds: string[];
  deleteLabel: string;
  deletingLabel: string;
  deleteConfirm: string;
  editLabel?: string;
  onEdit?: () => void;
};

export function PaymentRecordActions({
  paymentIds,
  deleteLabel,
  deletingLabel,
  deleteConfirm,
  editLabel,
  onEdit,
}: Props) {
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
      <form
        action={deleteAdminPayment}
        style={{ margin: 0, flex: "1 1 auto", minWidth: 0 }}
        onSubmit={(e) => {
          if (!window.confirm(deleteConfirm)) e.preventDefault();
        }}
      >
        <FormLoadingModal message={deletingLabel} />
        <input type="hidden" name="paymentIds" value={paymentIds.join(",")} />
        <button type="submit" className="btn" style={{ fontSize: 13, padding: "6px 14px", width: "100%" }}>
          {deleteLabel}
        </button>
      </form>
    </div>
  );
}
