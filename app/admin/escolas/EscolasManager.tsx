"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createSchool, updateSchool, toggleSchoolActive, type SchoolResult } from "./actions";

type School = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
};

function ToggleSchoolActiveForm({ schoolId, isActive }: { schoolId: string; isActive: boolean }) {
  const [toggleState, toggleAction] = useFormState(toggleSchoolActive, null);
  return (
    <form action={toggleAction} style={{ display: "inline" }}>
      <input type="hidden" name="schoolId" value={schoolId} />
      <input type="hidden" name="isActive" value={String(isActive)} />
      <button
        type="submit"
        className="btn btn-secondary"
        style={{ fontSize: "var(--text-sm)", color: isActive ? "var(--warning)" : "var(--success)" }}
      >
        {isActive ? "Desativar" : "Ativar"}
      </button>
      {toggleState?.error && <span style={{ color: "var(--danger)", fontSize: "var(--text-xs)", marginLeft: 8 }}>{toggleState.error}</span>}
    </form>
  );
}

export function EscolasManager({ schools: initialSchools }: { schools: School[] }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [createState, createAction] = useFormState(createSchool, null as SchoolResult);
  const [updateState, updateAction] = useFormState(updateSchool, null as SchoolResult);

  const startEdit = (school: School) => {
    setEditingId(school.id);
    setEditName(school.name);
    setEditAddress(school.address ?? "");
    setEditCity(school.city ?? "");
    setEditPhone(school.phone ?? "");
    setEditEmail(school.email ?? "");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {initialSchools.map((school) => (
        <div
          key={school.id}
          className="card"
          style={{
            padding: "var(--space-4)",
            opacity: school.isActive ? 1 : 0.6,
            border: school.isActive ? "1px solid var(--border)" : "1px solid var(--text-secondary)",
          }}
        >
          {editingId === school.id ? (
            <form action={updateAction} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <input type="hidden" name="schoolId" value={school.id} />
              <input
                name="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome da escola *"
                required
                style={{ padding: "var(--space-2)", fontSize: "var(--text-sm)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
              />
              <input
                name="city"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                placeholder="Cidade"
                style={{ padding: "var(--space-2)", fontSize: "var(--text-sm)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
              />
              <input
                name="address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Morada completa"
                style={{ padding: "var(--space-2)", fontSize: "var(--text-sm)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
              />
              <input
                name="phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Telefone"
                style={{ padding: "var(--space-2)", fontSize: "var(--text-sm)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
              />
              <input
                name="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Email"
                type="email"
                style={{ padding: "var(--space-2)", fontSize: "var(--text-sm)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
              />
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }}>
                  Guardar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: "var(--text-sm)" }}
                  onClick={() => setEditingId(null)}
                >
                  Cancelar
                </button>
              </div>
              {updateState?.error && <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)", margin: 0 }}>{updateState.error}</p>}
              {updateState?.success && <p style={{ color: "var(--success)", fontSize: "var(--text-sm)", margin: 0 }}>{updateState.success}</p>}
            </form>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text-primary)" }}>
                    {school.name}
                  </span>
                  {!school.isActive && (
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: "var(--text-secondary)",
                        color: "#fff",
                      }}
                    >
                      Inativa
                    </span>
                  )}
                </div>
                {school.city && (
                  <p style={{ margin: "4px 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                    📍 {school.city}
                  </p>
                )}
                {school.address && (
                  <p style={{ margin: "4px 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                    {school.address}
                  </p>
                )}
                {school.phone && (
                  <p style={{ margin: "4px 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                    📞 {school.phone}
                  </p>
                )}
                {school.email && (
                  <p style={{ margin: "4px 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                    ✉️ {school.email}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: "var(--text-sm)" }}
                  onClick={() => startEdit(school)}
                >
                  Editar
                </button>
                <ToggleSchoolActiveForm schoolId={school.id} isActive={school.isActive} />
              </div>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div className="card" style={{ padding: "var(--space-4)", backgroundColor: "var(--bg-secondary)" }}>
          <h3 style={{ margin: "0 0 var(--space-3) 0", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>
            Nova escola
          </h3>
          <form action={createAction} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <input
              name="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da escola *"
              required
              style={{ padding: "var(--space-2)", fontSize: "var(--text-sm)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
            />
            <input
              name="city"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="Cidade"
              style={{ padding: "var(--space-2)", fontSize: "var(--text-sm)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
            />
            <input
              name="address"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Morada completa"
              style={{ padding: "var(--space-2)", fontSize: "var(--text-sm)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
            />
            <input
              name="phone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Telefone"
              style={{ padding: "var(--space-2)", fontSize: "var(--text-sm)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
            />
            <input
              name="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email"
              type="email"
              style={{ padding: "var(--space-2)", fontSize: "var(--text-sm)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
            />
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }}>
                Criar escola
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: "var(--text-sm)" }}
                onClick={() => {
                  setAdding(false);
                  setNewName("");
                  setNewAddress("");
                  setNewCity("");
                  setNewPhone("");
                  setNewEmail("");
                }}
              >
                Cancelar
              </button>
            </div>
            {createState?.error && <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)", margin: 0 }}>{createState.error}</p>}
            {createState?.success && <p style={{ color: "var(--success)", fontSize: "var(--text-sm)", margin: 0 }}>{createState.success}</p>}
          </form>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          style={{ alignSelf: "flex-start" }}
          onClick={() => setAdding(true)}
        >
          + Nova escola
        </button>
      )}
    </div>
  );
}
