import { describe, expect, it } from "vitest";
import { selectPostClassPrompts, type PromptAttendance, type PromptLesson } from "@/lib/post-class-rpe";

const lessons = new Map<string, PromptLesson>([
  ["mt19", { id: "mt19", modality: "MUAY_THAI", startTime: "19:00", endTime: "20:00" }],
  ["bx20", { id: "bx20", modality: "BOXING", startTime: "20:00", endTime: "21:00" }],
]);
const att = (id: string, studentId: string, lessonId: string, rpe: number | null = null, rpeSource: string | null = null): PromptAttendance => ({
  id,
  studentId,
  lessonId,
  rpe,
  rpeSource,
});
const at = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

describe("selectPostClassPrompts", () => {
  it("só envia entre 30 min e 3 h depois do fim da aula", () => {
    const list = [att("a1", "s1", "mt19")];
    expect(selectPostClassPrompts(list, lessons, new Set(), at("20:20"))).toHaveLength(0);
    expect(selectPostClassPrompts(list, lessons, new Set(), at("20:30"))).toHaveLength(1);
    expect(selectPostClassPrompts(list, lessons, new Set(), at("23:00"))).toHaveLength(1);
    expect(selectPostClassPrompts(list, lessons, new Set(), at("23:01"))).toHaveLength(0);
  });

  it("não envia a quem já deu nota, mas envia se só houver a estimativa do coach", () => {
    const list = [att("a1", "s1", "mt19", 7, "STUDENT"), att("a2", "s2", "mt19", 6, "COACH")];
    const out = selectPostClassPrompts(list, lessons, new Set(), at("20:45"));
    expect(out.map((x) => x.attendance.id)).toEqual(["a2"]);
  });

  it("não repete um lembrete já enviado", () => {
    const out = selectPostClassPrompts([att("a1", "s1", "mt19")], lessons, new Set(["a1"]), at("20:45"));
    expect(out).toHaveLength(0);
  });

  it("um lembrete por aluno: a aula que acabou mais tarde", () => {
    const list = [att("a1", "s1", "mt19"), att("a2", "s1", "bx20")];
    const out = selectPostClassPrompts(list, lessons, new Set(), at("21:40"));
    expect(out).toHaveLength(1);
    expect(out[0].attendance.id).toBe("a2");
  });
});
