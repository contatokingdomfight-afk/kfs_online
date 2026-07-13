import { winnerFromTotals } from "./scoring";

export function cornerWinnerLabel(
  blueScore: number,
  redScore: number,
  athleteBlueName: string,
  athleteRedName: string
): string {
  const corner = winnerFromTotals(blueScore, redScore);
  if (corner === "BLUE") return athleteBlueName;
  if (corner === "RED") return athleteRedName;
  return "Empate";
}
