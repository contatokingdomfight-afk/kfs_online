"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createLocation, updateLocation, deleteLocation, type LocationResult } from "./actions";

type Location = { id: string; name: string; address: string | null; sortOrder: number };

export function LocaisManager({ locations: initialLocations }: { locations: Location[] }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const [createState, createAction] = useFormState(createLocation, null as LocationResult | null);
  const [updateState, updateAction] = useFormState(updateLocation, null as LocationResult | null);

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditName(loc.name);
    setEditAddress(loc.address ?? "");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {initialLocations.map((loc) => (
        <div key={loc.id} className="card" style={{ padding: "var(--space-4)" }}>
          {editingId === loc.id ? (
            <form
              action={(fd) => {
                updateAction(fd);
                setEditingId(null);
              }}
              style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
            >
              <input type="hidden" name="locationId" value={loc.id} />
              <input
                type="text"
                name="name"
                className="input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do local"
                required
              />
              <input
                type="text"
                name="address"
                className="input"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Morada (opcional)"
              />
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }}>Guardar</button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }} onClick={() => setEditingId(null)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{loc.name}</span>
                {loc.address && <p style={{ margin: "4px 0 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{loc.address}</p>}
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }} onClick={() => startEdit(loc)}>Editar</button>
                <form action={deleteLocation} style={{ display: "inline" }}>
                  <input type="hidden" name="locationId" value={loc.id} />
                  <button type="submit" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)", color: "var(--danger)" }}>Remover</button>
                </form>
              </div>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <form
          action={(fd) => {
            createAction(fd);
            setAdding(false);
            setNewName("");
            setNewAddress("");
          }}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
        >
          <input
            type="text"
            name="name"
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do local"
            required
          />
          <input
            type="text"
            name="address"
            className="input"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Morada (opcional)"
          />
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }}>Adicionar local</button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }} onClick={() => { setAdding(false); setNewName(""); setNewAddress(""); }}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-secondary" style={{ alignSelf: "flex-start" }} onClick={() => setAdding(true)}>
          + Adicionar local
        </button>
      )}

      {(createState?.error || updateState?.error) && (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>{createState?.error ?? updateState?.error}</p>
      )}
      {(createState?.success || updateState?.success) && (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--success)" }}>Guardado.</p>
      )}
    </div>
  );
}
