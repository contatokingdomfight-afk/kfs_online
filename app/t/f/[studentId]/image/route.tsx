import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getFighterCardData } from "@/lib/fighter-card";
import {
  buildFighterCardElement,
  FIGHTER_CARD_WIDTH,
  FIGHTER_CARD_HEIGHT,
  DISPLAY_FONT_FAMILY,
} from "@/lib/fighter-card-image";
import { getPublicOrigin } from "@/lib/site-public-url";

export const revalidate = 3600;

// Lido uma vez por instância de servidor (ficheiro local, sem pedido de rede — ao contrário de
// carregar uma Google Font em runtime, o que reintroduziria o mesmo tipo de falha silenciosa
// que o avatar remoto já causava).
let displayFontPromise: Promise<{ name: string; data: ArrayBuffer; weight: 400; style: "normal" }> | null = null;
function loadDisplayFont() {
  if (!displayFontPromise) {
    displayFontPromise = readFile(path.join(process.cwd(), "public/fonts/BebasNeue-Regular.ttf")).then((buf) => ({
      name: DISPLAY_FONT_FAMILY,
      data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      weight: 400 as const,
      style: "normal" as const,
    }));
  }
  return displayFontPromise;
}

function hostOnly(origin: string): string {
  return origin.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function fallbackImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#c1121f", letterSpacing: 3 }}>
        KINGDOM FIGHT SCHOOL
      </div>
      <div style={{ display: "flex", fontSize: 28, color: "#c9c9c9", marginTop: 24 }}>
        Este Fighter Card não está disponível.
      </div>
    </div>
  );
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const ctaHost = hostOnly(getPublicOrigin());

  const admin = getAdminClientOrNull();
  if (!admin.client) {
    return new ImageResponse(fallbackImage(), { width: FIGHTER_CARD_WIDTH, height: FIGHTER_CARD_HEIGHT });
  }

  const result = await getFighterCardData(admin.client, studentId);
  if (!result.ok) {
    return new ImageResponse(fallbackImage(), { width: FIGHTER_CARD_WIDTH, height: FIGHTER_CARD_HEIGHT });
  }

  const fonts = await loadDisplayFont()
    .then((font) => [font])
    .catch(() => []);

  try {
    return new ImageResponse(buildFighterCardElement(result.data, ctaHost), {
      width: FIGHTER_CARD_WIDTH,
      height: FIGHTER_CARD_HEIGHT,
      fonts,
    });
  } catch {
    // Fonte comum de falha: avatarUrl (foto do Google/Storage) inacessível ao renderizador
    // do next/og — em vez de deixar a rota rebentar (imagem em falta na partilha), tenta
    // de novo sem foto (cai nas iniciais) antes de desistir de vez.
    try {
      return new ImageResponse(buildFighterCardElement({ ...result.data, avatarUrl: null }, ctaHost), {
        width: FIGHTER_CARD_WIDTH,
        height: FIGHTER_CARD_HEIGHT,
        fonts,
      });
    } catch {
      return new ImageResponse(fallbackImage(), { width: FIGHTER_CARD_WIDTH, height: FIGHTER_CARD_HEIGHT });
    }
  }
}
