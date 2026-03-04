"use client";

import { useState } from "react";
import { signOut } from "@/app/actions/auth";

type Props = {
  label: string;
  variant?: "sidebar" | "button";
};

export function LogoutButton({ label, variant = "sidebar" }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
      setLoading(false);
    }
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="btn btn-secondary"
        style={{ width: "100%" }}
      >
        {loading ? "A sair..." : label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="app-sidebar-logout-btn"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: "clamp(44px, 11vw, 48px)",
        padding: "12px 16px",
        fontSize: "clamp(14px, 3.5vw, 16px)",
        fontWeight: 600,
        color: "var(--danger)",
        backgroundColor: "var(--bg)",
        border: "2px solid var(--danger)",
        borderRadius: "var(--radius-md)",
        boxSizing: "border-box",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        width: "100%",
        transition: "background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease",
      }}
    >
      {loading ? "A sair..." : label}
    </button>
  );
}
