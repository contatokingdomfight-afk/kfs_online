import { describe, expect, it } from "vitest";
import type { PlanAccess } from "@/lib/plan-access";
import { getStudentNavAreas, studentNavAreaHrefs } from "@/lib/dashboard-student-nav";

const t = (key: string) => key;

const fullAccess: PlanAccess = {
  hasDigitalAccess: true,
  hasPerformanceTracking: true,
  hasCheckIn: true,
  maxCheckInsPerDay: null,
  maxCheckInsPerMonth: null,
  hasExclusiveBenefits: true,
  allowedModalities: ["MUAY_THAI"],
  primaryModality: "MUAY_THAI",
  currentPlanId: "plan-1",
  canSubscribeDigitalLibraryAddon: false,
};

const noExtras: PlanAccess = {
  ...fullAccess,
  hasPerformanceTracking: false,
  hasCheckIn: false,
  hasExclusiveBenefits: false,
};

function areas(planAccess: PlanAccess, hasPlan: boolean, hasSchoolAssistantCoach = false) {
  return getStudentNavAreas({ t, locale: "pt", planAccess, hasPlan, hasSchoolAssistantCoach });
}

describe("getStudentNavAreas", () => {
  it("com plano: 4 áreas principais + conta, nesta ordem", () => {
    expect(areas(fullAccess, true).map((a) => a.id)).toEqual(["hoje", "evolucao", "treino", "tribo", "conta"]);
  });

  it("sem plano: hoje, treino, escolher plano e conta", () => {
    expect(areas(fullAccess, false).map((a) => a.id)).toEqual(["hoje", "treino", "plano", "conta"]);
  });

  it("evolução só mostra perfil/graduação/rank com performance tracking e presenças com check-in", () => {
    const full = areas(fullAccess, true).find((a) => a.id === "evolucao")!.children.map((c) => c.href);
    expect(full).toEqual(
      expect.arrayContaining([
        "/dashboard/performance",
        "/dashboard/graduacao",
        "/dashboard/performance/historico",
        "/dashboard/conquistas",
        "/dashboard/rank",
        "/dashboard/historico",
        "/como-sou-avaliado",
      ])
    );
    const limited = areas(noExtras, true).find((a) => a.id === "evolucao")!.children.map((c) => c.href);
    expect(limited).toEqual(["/como-sou-avaliado"]);
  });

  it("benefícios só aparecem na tribo com o acesso respetivo", () => {
    const tribo = (p: PlanAccess) => areas(p, true).find((a) => a.id === "tribo")!.children.map((c) => c.href);
    expect(tribo(fullAccess)).toContain("/dashboard/beneficios");
    expect(tribo(noExtras)).not.toContain("/dashboard/beneficios");
  });

  it("o atalho de assistente fica na conta só para assistentes", () => {
    const conta = (assistant: boolean) =>
      areas(fullAccess, true, assistant).find((a) => a.id === "conta")!.children.map((c) => c.href);
    expect(conta(true)).toContain("/coach");
    expect(conta(false)).not.toContain("/coach");
  });

  it("conta segue a ordem Perfil, Ficha física, Plano e pagamentos, Família, Documentos, Notificações", () => {
    const conta = getStudentNavAreas({ t, locale: "pt", planAccess: fullAccess, hasPlan: true, hasFamily: true })
      .find((a) => a.id === "conta")!
      .children.map((c) => c.href);
    expect(conta.slice(0, 6)).toEqual([
      "/dashboard/perfil",
      "/dashboard/ficha-fisica",
      "/dashboard/financeiro",
      "/dashboard/familia",
      "/dashboard/documentos-adesao",
      "/dashboard/notificacoes",
    ]);
    const semFamilia = areas(fullAccess, true).find((a) => a.id === "conta")!.children.map((c) => c.href);
    expect(semFamilia).not.toContain("/dashboard/familia");
  });

  it("nenhum destino aparece em duas áreas (fora da própria entrada da área)", () => {
    const seen = new Map<string, string>();
    for (const area of areas(fullAccess, true)) {
      for (const c of area.children) {
        if (c.href === area.href) continue;
        expect(seen.has(c.href), `${c.href} em ${seen.get(c.href)} e ${area.id}`).toBe(false);
        seen.set(c.href, area.id);
      }
    }
  });
});

describe("studentNavAreaHrefs", () => {
  it("inclui os grupos dos filhos e ignora /dashboard (Hoje)", () => {
    const all = areas(fullAccess, true);
    const evolucao = studentNavAreaHrefs(all.find((a) => a.id === "evolucao")!);
    expect(evolucao).toContain("/dashboard/evolucao");
    expect(evolucao).toContain("/sistema-pontuacao");
    const conta = studentNavAreaHrefs(all.find((a) => a.id === "conta")!);
    expect(conta).not.toContain("/dashboard");
  });
});
