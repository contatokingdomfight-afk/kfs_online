/**
 * Insere uma `StudentPhysicalAssessment` de demonstração para o aluno demo@teste.com
 * (dados médios / adulto saudável, ilustrativos).
 *
 * Requer: DATABASE_URL no .env ou .env.local
 *
 * Uso:
 *   npm run seed:demo-anamnesis
 *   npm run seed:demo-anamnesis -- --replace   # remove fichas existentes desse aluno e insere uma nova
 */
import { PrismaClient } from "@prisma/client";
import { addMonths, startOfDay } from "date-fns";
import { config } from "dotenv";
import { resolve } from "node:path";

import type { PhysicalAssessmentFormData } from "../lib/physical-assessment-types";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const DEMO_EMAIL = "demo@teste.com";

const prisma = new PrismaClient();

/** Valores próximos de adulto ~30 anos, IMC ~23; não são referência clínica. */
function buildDemoFormData(signatureDate: string): PhysicalAssessmentFormData {
  return {
    objectives: ["CONDICIONAMENTO", "LAZER"],
    medicalConditions: ["NENHUMA"],
    usesMedication: false,
    hasInjuries: false,
    parqChestPain: false,
    parqFainted: false,
    parqBoneJoint: false,
    parqDoctorLimit: false,
    parqOther: false,
    activityLevel: "ATIVO_REGULAR",
    previousMartialArts: false,
    heartRateRest: 72,
    bloodPressure: "120/80",
    saturationO2: "98",
    mobilityLimitations: ["BOA_GERAL"],
    posturalAssessment: ["NORMAL"],
    lenArmShoulderFingertipLeftCm: 60,
    lenArmShoulderFingertipRightCm: 61,
    lenLegInseamLeftCm: 80,
    lenLegInseamRightCm: 80,
    breadthShoulderCm: 42,
    circArmLeftCm: 32,
    circArmRightCm: 32,
    circBicepsLeftCm: 35,
    circBicepsRightCm: 35,
    circForearmLeftCm: 28,
    circForearmRightCm: 28,
    circNeckCm: 38,
    circHeadCm: 56,
    circAbdomenCm: 88,
    circChestCm: 98,
    circHipCm: 98,
    circThighLeftCm: 56,
    circThighRightCm: 57,
    circCalfLeftCm: 37,
    circCalfRightCm: 37,
    shoeSizeBr: "42",
    footLengthCm: 26,
    pushups1min: 28,
    situps1min: 32,
    plankSeconds: 75,
    squats1min: 30,
    runTest: "5 km leve / ocasional",
    scoreCondition: 7,
    scoreMobility: 8,
    scoreCoordination: 7,
    scoreEndurance: 7,
    scoreStrength: 7,
    instructorNotes: "Ficha de demonstração com valores médios; acompanhamento desportivo.",
    signatureDate,
  };
}

async function resolveCoachId(schoolId: string): Promise<string | null> {
  const link = await prisma.coachSchool.findFirst({
    where: { schoolId },
    select: { coachId: true },
  });
  if (link?.coachId) return link.coachId;
  const anyCoach = await prisma.coach.findFirst({ select: { id: true } });
  return anyCoach?.id ?? null;
}

async function main() {
  const replace = process.argv.includes("--replace");

  const user = await prisma.user.findFirst({
    where: { email: { equals: DEMO_EMAIL, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) {
    console.error(`Nenhum User com email ${DEMO_EMAIL}. Correr antes: npm run seed:test-users`);
    process.exit(1);
  }

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { id: true, schoolId: true },
  });
  if (!student) {
    console.error(`O utilizador ${DEMO_EMAIL} não tem registo Student.`);
    process.exit(1);
  }

  const coachId = await resolveCoachId(student.schoolId);
  if (!coachId) {
    console.error("Nenhum Coach na escola do demo (nem global). Crie um coach antes.");
    process.exit(1);
  }

  const count = await prisma.studentPhysicalAssessment.count({
    where: { studentId: student.id },
  });

  if (count > 0 && !replace) {
    console.log(
      `O aluno ${DEMO_EMAIL} já tem ${count} ficha(s). Nada alterado. Use --replace para substituir.`
    );
    return;
  }

  if (replace && count > 0) {
    await prisma.studentPhysicalAssessment.deleteMany({ where: { studentId: student.id } });
    console.log(`Removidas ${count} ficha(s) anteriores do demo.`);
  }

  const assessedAt = startOfDay(new Date());
  const nextDueAt = startOfDay(addMonths(assessedAt, 6));
  const signatureDate = assessedAt.toISOString().slice(0, 10);
  const formData = buildDemoFormData(signatureDate);

  await prisma.studentPhysicalAssessment.create({
    data: {
      studentId: student.id,
      coachId,
      assessedAt,
      nextDueAt,
      clearance: "APTO",
      formData: formData as object,
    },
  });

  console.log(`Ficha de anamnese / avaliação física criada para ${DEMO_EMAIL}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
