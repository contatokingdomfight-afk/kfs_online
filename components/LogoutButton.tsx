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
        minHeight: "clamp(44px, 11vw, 48px)",
        padding: "12px 20px",
        fontSize: "clamp(14px, 3.5vw, 16px)",
        fontWeight: 500,
        color: "var(--text-primary)",
        backgroundColor: "transparent",
        border: "none",
        borderLeft: "4px solid transparent",
        boxSizing: "border-box",
        borderRadius: "0 var(--radius-md) var(--radius-md) 0",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        width: "100%",
        textAlign: "left",
        transition: "background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease",
      }}
    >
      {loading ? "A sair..." : label}
    </button>
  );
}
