import { describe, expect, it } from "vitest";
import { assignWeeklyTribePhotos, isoWeekKey } from "@/lib/tribe-lesson-photos";

const photos = ["a", "b", "c", "d", "e", "f"];

const week41 = [
  { key: "l1_2026-10-05", date: "2026-10-05", startTime: "19:00" },
  { key: "l2_2026-10-07", date: "2026-10-07", startTime: "19:00" },
  { key: "l3_2026-10-08", date: "2026-10-08", startTime: "19:00" },
  { key: "l4_2026-10-09", date: "2026-10-09", startTime: "18:00" },
  { key: "l5_2026-10-10", date: "2026-10-10", startTime: "10:00" },
];
const week42 = week41.map((l) => {
  const d = new Date(`${l.date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  const date = d.toISOString().slice(0, 10);
  return { ...l, key: l.key.replace(l.date, date), date };
});

describe("isoWeekKey", () => {
  it("segunda e domingo da mesma semana dão a mesma chave", () => {
    expect(isoWeekKey("2026-10-05")).toBe("2026-W41");
    expect(isoWeekKey("2026-10-11")).toBe("2026-W41");
    expect(isoWeekKey("2026-10-12")).toBe("2026-W42");
  });

  it("trata a viragem do ano (semana 1 começa na segunda da semana com quinta)", () => {
    expect(isoWeekKey("2026-12-31")).toBe("2026-W53");
    expect(isoWeekKey("2027-01-04")).toBe("2027-W01");
  });
});

describe("assignWeeklyTribePhotos", () => {
  it("dentro da semana, cada aula tem uma foto diferente", () => {
    const map = assignWeeklyTribePhotos(week41, photos);
    const used = week41.map((l) => map[l.key]);
    expect(new Set(used).size).toBe(week41.length);
  });

  it("é estável: a mesma semana dá sempre a mesma distribuição, mesmo com outra ordem de entrada", () => {
    const a = assignWeeklyTribePhotos(week41, photos);
    const b = assignWeeklyTribePhotos([...week41].reverse(), photos);
    expect(b).toEqual(a);
  });

  it("muda de uma semana para a outra", () => {
    const map = assignWeeklyTribePhotos([...week41, ...week42], photos);
    const w41 = week41.map((l) => map[l.key]).join(",");
    const w42 = week42.map((l) => map[l.key]).join(",");
    expect(w42).not.toBe(w41);
  });

  it("com menos fotos do que aulas, repete em ciclo; sem fotos, devolve vazio", () => {
    const map = assignWeeklyTribePhotos(week41, ["x", "y"]);
    expect(week41.every((l) => ["x", "y"].includes(map[l.key]))).toBe(true);
    expect(assignWeeklyTribePhotos(week41, [])).toEqual({});
  });
});
