/**
 * Copia dados do Postgres antigo (schema alargado) para o projeto EU (schema Prisma actual).
 * Requer: OLD_DATABASE_URL (ou MIGRATE_SOURCE_DATABASE_URL) e DATABASE_URL (destino EU).
 * Uso: npx tsx scripts/migrate-old-db-to-eu.ts
 * Opções:
 *   --no-truncate  (não limpa o destino antes; pode falhar em duplicados de PK)
 *   --ama-only     (só repõe AthleteMissionAward a partir do antigo: apaga no EU e recopia)
 */
import { config } from "dotenv";
import path from "path";
import pg from "pg";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const { Client } = pg;

type Modality = "MUAY_THAI" | "BOXING" | "KICKBOXING";

function mapModality(code: string | null | undefined): Modality {
  const m: Record<string, Modality> = {
    MUAY_THAI: "MUAY_THAI",
    BOXING: "BOXING",
    KICKBOXING: "KICKBOXING",
    MMA: "MUAY_THAI",
    BJJ: "KICKBOXING",
    KRT: "BOXING",
  };
  return m[code ?? ""] ?? "MUAY_THAI";
}

function mapModalityText(code: string | null | undefined): string | null {
  if (code == null) return null;
  return mapModality(code);
}

async function migrateAmaOnly(sourceUrl: string, targetUrl: string) {
  const src = new Client({ connectionString: sourceUrl });
  const dst = new Client({ connectionString: targetUrl });
  await src.connect();
  await dst.connect();
  try {
    await dst.query('DELETE FROM "AthleteMissionAward";');
    const { rows } = await src.query(
      `SELECT id, "athleteId", "dimensionCode", "targetScore", "xpAwarded", COALESCE("createdAt", NOW()) AS "createdAt" FROM "AthleteMissionAward" ORDER BY id`,
    );
    for (const r of rows) {
      await dst.query(
        `INSERT INTO "AthleteMissionAward" (id, "athleteId", "dimensionCode", "targetScore", "xpAwarded", "createdAt") VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          r.id,
          r.athleteId,
          r.dimensionCode,
          r.targetScore,
          r.xpAwarded,
          r.createdAt,
        ],
      );
    }
    console.log(`AthleteMissionAward: ${rows.length} linhas copiadas.`);
  } finally {
    await src.end();
    await dst.end();
  }
}

async function main() {
  const sourceUrl =
    process.env.OLD_DATABASE_URL ?? process.env.MIGRATE_SOURCE_DATABASE_URL;
  const targetUrl =
    process.env.MIGRATE_TARGET_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!sourceUrl) {
    console.error(
      "Defina OLD_DATABASE_URL (connection string do Supabase antigo, modo direct/session).",
    );
    process.exit(1);
  }
  if (!targetUrl) {
    console.error("Defina DATABASE_URL para o projeto EU.");
    process.exit(1);
  }

  if (process.argv.includes("--ama-only")) {
    await migrateAmaOnly(sourceUrl, targetUrl);
    return;
  }

  const noTruncate = process.argv.includes("--no-truncate");

  const src = new Client({ connectionString: sourceUrl });
  const dst = new Client({ connectionString: targetUrl });

  await src.connect();
  await dst.connect();

  try {
    await dst.query("BEGIN");

    if (!noTruncate) {
      await dst.query(`
        TRUNCATE TABLE
          "StudentPhysicalAssessment",
          "AthleteMissionCompletion",
          "AthleteMissionAward",
          "Payment",
          "Comment",
          "Attendance",
          "TrialClass",
          "Lesson",
          "Athlete",
          "CoachSchool",
          "MissionTemplate",
          "Location",
          "Student",
          "Coach",
          "Plan",
          "User",
          "School"
        RESTART IDENTITY CASCADE;
      `);
    }

    // 1. School
    {
      const { rows } = await src.query(
        `SELECT id, name, address, city, phone, email, "isActive", "createdAt", "updatedAt" FROM "School"`,
      );
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "School" (id, name, address, city, phone, email, "isActive", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            r.id,
            r.name,
            r.address,
            r.city,
            r.phone,
            r.email,
            r.isActive,
            r.createdAt,
            r.updatedAt,
          ],
        );
      }
      console.log(`School: ${rows.length}`);
    }

    // 2. User (sem avatarUrl)
    {
      const { rows } = await src.query(
        `SELECT id, "authUserId", email, name, role, "createdAt" FROM "User"`,
      );
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "User" (id, "authUserId", email, name, role, "createdAt")
           VALUES ($1,$2,$3,$4,$5::"Role",$6)`,
          [r.id, r.authUserId, r.email, r.name, r.role, r.createdAt],
        );
      }
      console.log(`User: ${rows.length}`);
    }

    // 3. Plan (mapeamento snake_case → Prisma)
    {
      const { rows } = await src.query(`
        SELECT id, name, description, price_monthly AS "priceMonthly", "schoolId",
               includes_digital_access AS "includesDigitalAccess",
               modality_scope AS "modalityScope",
               is_active AS "isActive",
               "createdAt",
               "createdAt" AS "updatedAt"
        FROM "Plan"
      `);
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "Plan" (id, name, description, "priceMonthly", "schoolId", "includesDigitalAccess", "modalityScope", "isActive", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            r.id,
            r.name,
            r.description,
            r.priceMonthly,
            r.schoolId,
            r.includesDigitalAccess,
            r.modalityScope,
            r.isActive,
            r.createdAt,
            r.updatedAt,
          ],
        );
      }
      console.log(`Plan: ${rows.length}`);
    }

    // 4. Student (só colunas Prisma)
    {
      const { rows } = await src.query(
        `SELECT id, "userId", "schoolId", status, "createdAt" FROM "Student"`,
      );
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "Student" (id, "userId", "schoolId", status, "createdAt")
           VALUES ($1,$2,$3,$4::"StudentStatus",$5)`,
          [r.id, r.userId, r.schoolId, r.status, r.createdAt],
        );
      }
      console.log(`Student: ${rows.length}`);
    }

    // 5. Coach
    {
      const { rows } = await src.query(
        `SELECT id, "userId", "studentId", specialties, "createdAt" FROM "Coach"`,
      );
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "Coach" (id, "userId", "studentId", specialties, "createdAt")
           VALUES ($1,$2,$3,$4,$5)`,
          [r.id, r.userId, r.studentId, r.specialties, r.createdAt],
        );
      }
      console.log(`Coach: ${rows.length}`);
    }

    // 6. CoachSchool
    {
      const { rows } = await src.query(`SELECT "coachId", "schoolId" FROM "CoachSchool"`);
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "CoachSchool" ("coachId", "schoolId") VALUES ($1,$2)`,
          [r.coachId, r.schoolId],
        );
      }
      console.log(`CoachSchool: ${rows.length}`);
    }

    // 7. Athlete
    {
      const { rows } = await src.query(
        `SELECT id, "studentId", level, xp, "displayBeltIndex", "lastBeltPromotionAt", "mainCoachId", "createdAt" FROM "Athlete"`,
      );
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "Athlete" (id, "studentId", level, xp, "displayBeltIndex", "lastBeltPromotionAt", "mainCoachId", "createdAt")
           VALUES ($1,$2,$3::"AthleteLevel",$4,$5,$6,$7,$8)`,
          [
            r.id,
            r.studentId,
            r.level,
            r.xp,
            r.displayBeltIndex,
            r.lastBeltPromotionAt,
            r.mainCoachId,
            r.createdAt,
          ],
        );
      }
      console.log(`Athlete: ${rows.length}`);
    }

    // 8. MissionTemplate (modalidade texto → código compatível com app)
    {
      const { rows } = await src.query(
        `SELECT id, name, description, modality, "beltIndex", "xpReward", "sortOrder", "isActive", "createdAt", "updatedAt" FROM "MissionTemplate"`,
      );
      for (const r of rows) {
        const mod = mapModalityText(r.modality);
        await dst.query(
          `INSERT INTO "MissionTemplate" (id, name, description, modality, "beltIndex", "xpReward", "sortOrder", "isActive", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            r.id,
            r.name,
            r.description,
            mod,
            r.beltIndex,
            r.xpReward,
            r.sortOrder,
            r.isActive,
            r.createdAt,
            r.updatedAt,
          ],
        );
      }
      console.log(`MissionTemplate: ${rows.length}`);
    }

    // 9. Location
    {
      const { rows } = await src.query(
        `SELECT id, name, address, "schoolId", "sortOrder", "createdAt" FROM "Location"`,
      );
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "Location" (id, name, address, "schoolId", "sortOrder", "createdAt")
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [r.id, r.name, r.address, r.schoolId, r.sortOrder, r.createdAt],
        );
      }
      console.log(`Location: ${rows.length}`);
    }

    // 10. Lesson (enum Modality; data obrigatória; coach obrigatório no destino)
    {
      const { rows } = await src.query(
        `SELECT id, modality,
                COALESCE(date, "createdAt"::date) AS date,
                "startTime", "endTime", "coachId", "schoolId", capacity, "planningNotes",
                COALESCE("isOneOff", false) AS "isOneOff", COALESCE("isOpenClass", false) AS "isOpenClass", "createdAt"
         FROM "Lesson"`,
      );
      for (const r of rows) {
        const modality = mapModality(r.modality);
        const lessonDate = r.date;
        let coachId: string | null = r.coachId;
        if (!coachId) {
          const pick = await src.query(
            `SELECT c.id FROM "Coach" c
             INNER JOIN "CoachSchool" cs ON cs."coachId" = c.id
             WHERE cs."schoolId" = $1 LIMIT 1`,
            [r.schoolId],
          );
          coachId = pick.rows[0]?.id ?? null;
          if (!coachId) {
            const any = await src.query(`SELECT id FROM "Coach" LIMIT 1`);
            coachId = any.rows[0]?.id ?? null;
          }
          if (!coachId) {
            console.warn(
              `Lesson ${r.id} sem coach e sem coach disponível — ignorada.`,
            );
            continue;
          }
          console.warn(
            `Lesson ${r.id}: coachId em falta na origem; usado coach de recurso ${coachId}.`,
          );
        }
        await dst.query(
          `INSERT INTO "Lesson" (id, modality, date, "startTime", "endTime", "coachId", "schoolId", capacity, "planningNotes", "isOneOff", "isOpenClass", "createdAt")
           VALUES ($1, $2::"Modality", $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            r.id,
            modality,
            lessonDate,
            r.startTime,
            r.endTime,
            coachId,
            r.schoolId,
            r.capacity,
            r.planningNotes,
            r.isOneOff,
            r.isOpenClass,
            r.createdAt,
          ],
        );
      }
      console.log(`Lesson: ${rows.length} (linhas na origem; ver avisos se ignoradas)`);
    }

    // 11. TrialClass (origem antiga pode não ter acceptedAt)
    {
      const col = await src.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'TrialClass' AND column_name = 'acceptedAt'
      `);
      const hasAcceptedAt = col.rows.length > 0;
      const { rows } = hasAcceptedAt
        ? await src.query(
            `SELECT id, name, contact, modality, "lessonDate", "lessonId", "acceptedAt", "convertedToStudent", "createdAt" FROM "TrialClass"`,
          )
        : await src.query(
            `SELECT id, name, contact, modality, "lessonDate", "lessonId", "convertedToStudent", "createdAt" FROM "TrialClass"`,
          );
      for (const r of rows) {
        const modality = mapModality(r.modality);
        const acceptedAt = hasAcceptedAt
          ? (r as { acceptedAt?: Date | null }).acceptedAt ?? null
          : null;
        await dst.query(
          `INSERT INTO "TrialClass" (id, name, contact, modality, "lessonDate", "lessonId", "acceptedAt", "convertedToStudent", "createdAt")
           VALUES ($1,$2,$3,$4::"Modality",$5::date,$6,$7,$8,$9)`,
          [
            r.id,
            r.name,
            r.contact,
            modality,
            r.lessonDate,
            r.lessonId,
            acceptedAt,
            r.convertedToStudent,
            r.createdAt,
          ],
        );
      }
      console.log(`TrialClass: ${rows.length}`);
    }

    // 12. Attendance (só colunas MVP)
    {
      const { rows } = await src.query(
        `SELECT id, "lessonId", "studentId", status, "isExperimental", "createdAt" FROM "Attendance"`,
      );
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "Attendance" (id, "lessonId", "studentId", status, "isExperimental", "createdAt")
           VALUES ($1,$2,$3,$4::"AttendanceStatus",$5,$6)`,
          [
            r.id,
            r.lessonId,
            r.studentId,
            r.status,
            r.isExperimental,
            r.createdAt,
          ],
        );
      }
      console.log(`Attendance: ${rows.length}`);
    }

    // 13. Comment
    {
      const { rows } = await src.query(
        `SELECT id, "authorCoachId", "targetType", "targetId", content, visibility, "createdAt" FROM "Comment"`,
      );
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "Comment" (id, "authorCoachId", "targetType", "targetId", content, visibility, "createdAt")
           VALUES ($1,$2,$3::"CommentTargetType",$4,$5,$6::"CommentVisibility",$7)`,
          [
            r.id,
            r.authorCoachId,
            r.targetType,
            r.targetId,
            r.content,
            r.visibility,
            r.createdAt,
          ],
        );
      }
      console.log(`Comment: ${rows.length}`);
    }

    // 14. Payment
    {
      const { rows } = await src.query(
        `SELECT id, "studentId", amount, status, "referenceMonth", "createdAt" FROM "Payment"`,
      );
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "Payment" (id, "studentId", amount, status, "referenceMonth", "createdAt")
           VALUES ($1,$2,$3,$4::"PaymentStatus",$5,$6)`,
          [
            r.id,
            r.studentId,
            r.amount,
            r.status,
            r.referenceMonth,
            r.createdAt,
          ],
        );
      }
      console.log(`Payment: ${rows.length}`);
    }

    // 15. AthleteMissionAward
    {
      const { rows } = await src.query(
        `SELECT id, "athleteId", "dimensionCode", "targetScore", "xpAwarded", COALESCE("createdAt", NOW()) AS "createdAt" FROM "AthleteMissionAward"`,
      );
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "AthleteMissionAward" (id, "athleteId", "dimensionCode", "targetScore", "xpAwarded", "createdAt")
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            r.id,
            r.athleteId,
            r.dimensionCode,
            r.targetScore,
            r.xpAwarded,
            r.createdAt,
          ],
        );
      }
      console.log(`AthleteMissionAward: ${rows.length}`);
    }

    // 16. AthleteMissionCompletion
    {
      const { rows } = await src.query(
        `SELECT id, "athleteId", "missionTemplateId", COALESCE("completedAt", NOW()) AS "completedAt", "xpAwarded" FROM "AthleteMissionCompletion"`,
      );
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "AthleteMissionCompletion" (id, "athleteId", "missionTemplateId", "completedAt", "xpAwarded")
           VALUES ($1,$2,$3,$4,$5)`,
          [
            r.id,
            r.athleteId,
            r.missionTemplateId,
            r.completedAt,
            r.xpAwarded,
          ],
        );
      }
      console.log(`AthleteMissionCompletion: ${rows.length}`);
    }

    // 17. StudentPhysicalAssessment
    {
      const { rows } = await src.query(
        `SELECT id, "studentId", "coachId", "assessedAt", "nextDueAt", clearance, "formData", COALESCE("createdAt", NOW()) AS "createdAt" FROM "StudentPhysicalAssessment"`,
      );
      for (const r of rows) {
        await dst.query(
          `INSERT INTO "StudentPhysicalAssessment" (id, "studentId", "coachId", "assessedAt", "nextDueAt", clearance, "formData", "createdAt")
           VALUES ($1,$2,$3,$4::date,$5::date,$6,$7::jsonb,$8)`,
          [
            r.id,
            r.studentId,
            r.coachId,
            r.assessedAt,
            r.nextDueAt,
            r.clearance,
            JSON.stringify(r.formData ?? {}),
            r.createdAt,
          ],
        );
      }
      console.log(`StudentPhysicalAssessment: ${rows.length}`);
    }

    await dst.query("COMMIT");
    console.log("Migração concluída com sucesso.");
  } catch (e) {
    await dst.query("ROLLBACK");
    console.error(e);
    process.exit(1);
  } finally {
    await src.end();
    await dst.end();
  }
}

main();
