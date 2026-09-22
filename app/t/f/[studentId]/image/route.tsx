import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getFighterCardData } from "@/lib/fighter-card";
import { buildFighterCardElement, FIGHTER_CARD_WIDTH, FIGHTER_CARD_HEIGHT } from "@/lib/fighter-card-image";
import { getPublicOrigin } from "@/lib/site-public-url";

export const revalidate = 3600;

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

  return new ImageResponse(buildFighterCardElement(result.data, ctaHost), {
    width: FIGHTER_CARD_WIDTH,
    height: FIGHTER_CARD_HEIGHT,
  });
}
