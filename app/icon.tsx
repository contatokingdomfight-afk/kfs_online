import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Ícone da app (aba do browser); evita 404 em pedidos a rotas geradas pelo App Router. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          background: "#121416",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        KFS
      </div>
    ),
    { ...size }
  );
}
