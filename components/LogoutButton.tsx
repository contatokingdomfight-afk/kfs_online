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
      className="app-sidebar-nav-link"
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: "clamp(44px, 11vw, 50px)",
        padding: "clamp(10px, 2.5vw, 12px) clamp(14px, 3.5vw, 16px)",
        fontSize: "clamp(15px, 3.8vw, 17px)",
        color: "var(--danger)",
        textDecoration: "none",
        fontWeight: 500,
        backgroundColor: "transparent",
        border: "none",
        borderLeft: "3px solid transparent",
        boxSizing: "border-box",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        width: "100%",
        textAlign: "left",
      }}
    >
      {loading ? "A sair..." : `🚪 ${label}`}
    </button>
  );
}
