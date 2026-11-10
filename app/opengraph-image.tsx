import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** Imagem de partilha nas redes (WhatsApp, Facebook, Instagram…), gerada no build. */
export const alt = "Kingdom Fight School — artes marciais em Sintra";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const emblem = await readFile(join(process.cwd(), "public/icons/kfs-emblem-512.png"));
  const src = `data:image/png;base64,${emblem.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: "0 80px",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a0d0e 60%, #4a0f12 100%)",
          color: "#fff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={300} height={300} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>Kingdom Fight School</div>
          <div style={{ fontSize: 34, color: "#fca5a5" }}>Treine com propósito. Lute com disciplina.</div>
          <div style={{ fontSize: 28, color: "#d4d4d8" }}>Muay Thai · Boxe · Kickboxing — Algueirão-Mem Martins, Sintra</div>
        </div>
      </div>
    ),
    size,
  );
}
