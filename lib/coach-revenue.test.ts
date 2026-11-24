import { describe, expect, it } from "vitest";
import {
  baseWithoutVat,
  computeCoachMonth,
  groupLinesByPlan,
  isKidsModality,
  splitCharge,
  type PlanRule,
  type TuitionCharge,
} from "./coach-revenue";

const P55: PlanRule = { id: "p55", name: "Presencial I", price: 55, scope: "SINGLE", mode: "PER_MODALITY", value: 40 };
const P50: PlanRule = { ...P55, id: "p50", price: 50 };
const P80: PlanRule = { id: "p80", name: "Pack 2 modalidades", price: 80, scope: "DUAL", mode: "PER_MODALITY", value: 35 };
const P65: PlanRule = { id: "p65", name: "KIDS 2 modalidades", price: 65, scope: "DUAL", mode: "PER_MODALITY", value: 35 };
const P100: PlanRule = { id: "p100", name: "Pack todas", price: 100, scope: "ALL", mode: "SPLIT_POOL", value: 80 };
const WEEK: PlanRule = { id: "week", name: "Kingdom Week", price: 25, scope: "SINGLE", mode: "FIXED", value: 10 };
const ONLINE: PlanRule = { id: "online", name: "Online", price: 20, scope: "NONE", mode: "NONE", value: null };

function charge(plan: PlanRule, primary: string | null, secondary: string | null = null, paid = true, id = "s1"): TuitionCharge {
  return { key: `${id}-${plan.id}`, studentId: id, studentName: id, plan, primaryModality: primary, secondaryModality: secondary, paid, paidAt: paid ? "2026-11-05" : null };
}

const mods = (entries: Record<string, string[]>) => new Map(Object.entries(entries).map(([k, v]) => [k, new Set(v)]));

describe("valores-base", () => {
  it("dividem por 1,23 e arredondam ao cêntimo", () => {
    expect(baseWithoutVat(55)).toBe(44.72);
    expect(baseWithoutVat(65)).toBe(52.85);
    expect(baseWithoutVat(80)).toBe(65.04);
    expect(baseWithoutVat(100)).toBe(81.3);
    expect(baseWithoutVat(25)).toBe(20.33);
  });
  it("modalidades KIDS", () => {
    expect(isKidsModality("MTKIDS")).toBe(true);
    expect(isKidsModality("BJJKIDS")).toBe(true);
    expect(isKidsModality("MUAY_THAI")).toBe(false);
  });
});

describe("splitCharge (exemplos do Anexo II)", () => {
  const school = mods({ rui: ["MUAY_THAI", "BOXING"], marco: ["BJJ", "MMA"], sofia: ["KICKBOXING"], ana: ["MTKIDS"] });

  it("1 modalidade, 55 €: 40% = 17,89 €", () => {
    expect(splitCharge(charge(P55, "MUAY_THAI"), school)).toEqual([{ coachId: "rui", amount: 17.89, rule: "40%", modalities: ["MUAY_THAI"] }]);
  });

  it("fidelização não reduz a parte do professor (usa o preço de tabela do plano)", () => {
    // P50 é outro plano com preço de tabela 50 €; o desconto de fidelização sobre P55 não muda P55.price.
    expect(splitCharge(charge(P55, "MUAY_THAI"), school)[0].amount).toBe(17.89);
    expect(splitCharge(charge(P50, "MUAY_THAI"), school)[0].amount).toBe(16.26);
  });

  it("2 modalidades com o mesmo professor: 70% = 45,53 €", () => {
    expect(splitCharge(charge(P80, "MUAY_THAI", "BOXING"), school)).toEqual([
      { coachId: "rui", amount: 45.53, rule: "35% × 2", modalities: ["MUAY_THAI", "BOXING"] },
    ]);
  });

  it("2 modalidades com professores diferentes: 22,76 € cada", () => {
    const r = splitCharge(charge(P80, "BOXING", "BJJ"), school);
    expect(r).toEqual([
      { coachId: "rui", amount: 22.76, rule: "35%", modalities: ["BOXING"] },
      { coachId: "marco", amount: 22.76, rule: "35%", modalities: ["BJJ"] },
    ]);
  });

  it("KIDS 2 modalidades, 65 €: 35% = 18,50 €", () => {
    const kids = mods({ ana: ["MTKIDS"], joao: ["BJJKIDS"] });
    expect(splitCharge(charge(P65, "MTKIDS", "BJJKIDS"), kids).map((s) => s.amount)).toEqual([18.5, 18.5]);
  });

  it("pack todas, 100 €: 80% ÷ professores de adultos (KIDS ficam fora)", () => {
    const r = splitCharge(charge(P100, "MUAY_THAI"), school);
    expect(r.map((s) => s.coachId)).toEqual(["rui", "marco", "sofia"]);
    expect(r.every((s) => s.amount === 21.68 && s.rule === "80% ÷ 3")).toBe(true);
  });

  it("pack todas com 4 professores: 16,26 € cada", () => {
    const four = mods({ a: ["MUAY_THAI"], b: ["BOXING"], c: ["BJJ"], d: ["MMA", "MTKIDS"] });
    expect(splitCharge(charge(P100, "MUAY_THAI"), four).map((s) => s.amount)).toEqual([16.26, 16.26, 16.26, 16.26]);
  });

  it("Kingdom Week: 10 € fixos ao professor da modalidade principal", () => {
    expect(splitCharge(charge(WEEK, "MUAY_THAI"), school)).toEqual([{ coachId: "rui", amount: 10, rule: "fixo", modalities: ["MUAY_THAI"] }]);
  });

  it("modalidade com 2 professores divide a meias", () => {
    const shared = mods({ rui: ["BOXING"], marco: ["BOXING"] });
    expect(splitCharge(charge(P55, "BOXING"), shared)).toEqual([
      { coachId: "rui", amount: 8.94, rule: "40% ÷ 2", modalities: ["BOXING"] },
      { coachId: "marco", amount: 8.94, rule: "40% ÷ 2", modalities: ["BOXING"] },
    ]);
  });

  it("plano sem regra ou modalidade sem professor: ninguém recebe", () => {
    expect(splitCharge(charge(ONLINE, "MUAY_THAI"), school)).toEqual([]);
    expect(splitCharge(charge(P55, "KARATE"), school)).toEqual([]);
    expect(splitCharge(charge(P55, null), school)).toEqual([]);
  });

  it("a 2.ª modalidade só conta em planos de 2 modalidades", () => {
    expect(splitCharge(charge(P55, "MUAY_THAI", "BJJ"), school).map((s) => s.coachId)).toEqual(["rui"]);
  });
});

describe("computeCoachMonth", () => {
  const school = mods({ rui: ["MUAY_THAI", "BOXING"], marco: ["BJJ"] });
  const charges = [
    charge(P80, "MUAY_THAI", "BOXING", true, "ana"),
    charge(P80, "BOXING", "BJJ", true, "carla"),
    charge(WEEK, "MUAY_THAI", null, false, "diogo"),
  ];

  it("separa recebido e previsão e conta alunos", () => {
    const rui = computeCoachMonth(charges, school).get("rui")!;
    expect(rui.received).toBe(68.29);
    expect(rui.pending).toBe(10);
    expect(rui.forecast).toBe(78.29);
    expect(rui.studentCount).toBe(3);
    expect(rui.paidStudentCount).toBe(2);
    expect(rui.pendingStudentCount).toBe(1);
    expect(rui.lines[0].paid).toBe(true);
  });

  it("professor sem alunos aparece com zero", () => {
    const empty = computeCoachMonth([], school).get("marco")!;
    expect(empty.received).toBe(0);
    expect(empty.lines).toEqual([]);
  });

  it("agrupa por plano e regra", () => {
    const rui = computeCoachMonth(charges, school).get("rui")!;
    expect(groupLinesByPlan(rui.lines)).toEqual([
      { planName: "Pack 2 modalidades", rule: "35% × 2", studentCount: 1, received: 45.53, pending: 0 },
      { planName: "Pack 2 modalidades", rule: "35%", studentCount: 1, received: 22.76, pending: 0 },
      { planName: "Kingdom Week", rule: "fixo", studentCount: 1, received: 0, pending: 10 },
    ]);
  });
});
