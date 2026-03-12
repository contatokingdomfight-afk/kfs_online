type Props = {
  defaultValue?: string;
  status?: string;
  modality?: string;
  school?: string;
  plan?: string;
};

export function AlunosSearchForm({
  defaultValue = "",
  status = "all",
  modality = "all",
  school = "all",
  plan = "all",
}: Props) {
  return (
    <form
      method="get"
      action="/admin/alunos"
      style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
    >
      {status !== "all" && <input type="hidden" name="status" value={status} />}
      {modality !== "all" && <input type="hidden" name="modality" value={modality} />}
      {school !== "all" && <input type="hidden" name="school" value={school} />}
      {plan !== "all" && <input type="hidden" name="plan" value={plan} />}
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Buscar por nome, email ou telefone"
        style={{
          fontSize: "clamp(14px, 3.5vw, 16px)",
          padding: "8px 12px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg)",
          color: "var(--text-primary)",
          minWidth: "clamp(200px, 40vw, 280px)",
        }}
        aria-label="Buscar por nome, email ou telefone"
      />
      <button type="submit" className="btn btn-secondary">
        Buscar
      </button>
    </form>
  );
}
