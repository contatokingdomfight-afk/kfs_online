import { describe, expect, it } from "vitest";
import {
  getImproveSuggestionsForAxes,
  rankCoursesForImprovement,
  type LibraryCourseRef,
} from "@/lib/library-improve-suggestions";

const courses: LibraryCourseRef[] = [
  { id: "1", name: "Técnica Muay", category: "TECHNIQUE", modality: "MUAY_THAI" },
  { id: "2", name: "Mindset", category: "MINDSET", modality: null },
  { id: "3", name: "Condicionamento", category: "PERFORMANCE", modality: "MUAY_THAI" },
];

describe("library-improve-suggestions", () => {
  it("prioriza curso da modalidade principal no eixo fraco", () => {
    const out = getImproveSuggestionsForAxes(
      courses,
      [{ id: "tecnico", label: "Técnico" }],
      "MUAY_THAI"
    );
    expect(out[0]?.course.id).toBe("1");
  });

  it("rankCoursesForImprovement devolve até limit cursos", () => {
    const ranked = rankCoursesForImprovement(courses, ["fisico", "mental"], "MUAY_THAI", 2);
    expect(ranked.length).toBe(2);
    expect(ranked[0]?.category).toBe("PERFORMANCE");
  });
});
