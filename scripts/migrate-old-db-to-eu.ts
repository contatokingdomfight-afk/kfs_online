/**
 * Copia dados do Postgres antigo (schema alargado) para o projeto EU (schema Prisma actual).
 * Requer: OLD_DATABASE_URL (ou MIGRATE_SOURCE_DATABASE_URL) e DATABASE_URL (destino EU).
 * Uso: npx tsx scripts/migrate-old-db-to-eu.ts
 * Opções:
 *   --no-truncate    (não limpa o destino antes; pode falhar em duplicados de PK)
 *   --ama-only       (só repõe AthleteMissionAward a partir do antigo: apaga no EU e recopia)
 *   --extended-only  (após schema de paridade no EU: copia tabelas alargadas + merge de campos extra em User/Student/Plan/Coach/Lesson/Attendance; sem TRUNCATE)
 *
 * Auth Supabase: os UUID em User."authUserId" têm de existir no MESMO projeto Auth
 * que a app usa, ou os utilizadores têm de voltar a entrar e alinhar por email.
 * Isto migra só Postgres (dados da app).
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

type PgClient = InstanceType<typeof Client>;

async function pgTableColumns(client: PgClient, tableName: string): Promise<Set<string>> {
  const { rows } = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );
  return new Set(rows.map((r) => r.column_name));
}

function intersectCols(
  a: Set<string>,
  b: Set<string>,
  table: string,
): string[] {
  const out: string[] = [];
  for (const c of a) {
    if (b.has(c)) out.push(c);
  }
  if (out.length === 0) {
    throw new Error(`Sem colunas em comum em "${table}" entre origem e destino.`);
  }
  return out;
}

/** Ordem respeitando FKs típicas do legado. */
const EXTENDED_TABLE_ORDER = [
  "ModalityRef",
  "GeneralDimension",
  "AttendanceGoal",
  "Course",
  "CourseModule",
  "CourseUnit",
  "CourseCreator",
  "CourseProgress",
  "CoursePurchase",
  "CourseUnitProgress",
  "WeekTheme",
  "ModalityEvaluationConfig",
  "EvaluationComponent",
  "EvaluationCriterion",
  "Event",
  "EventRegistration",
  "StudentProfile",
  "Notification",
  "StudentBadge",
  "AthleteEvaluation",
  "LessonCancellation",
  "LessonCoach",
  "PlanPrice",
  "waitlist",
  "PreLessonWellness",
  "PainSelfReport",
  "PhysicalBenchmarkEntry",
  "BodyWeightEntry",
] as const;

async function copyTableOnConflictDoNothing(
  src: PgClient,
  dst: PgClient,
  tableName: string,
): Promise<number> {
  const sc = await pgTableColumns(src, tableName);
  const dc = await pgTableColumns(dst, tableName);
  const cols = intersectCols(sc, dc, tableName);
  const quoted = cols.map((c) => `"${c}"`).join(", ");
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await src.query(`SELECT ${quoted} FROM "${tableName}"`);
  let n = 0;
  for (const r of rows) {
    const vals = cols.map((c) => (r as Record<string, unknown>)[c]);
    await dst.query(
      `INSERT INTO "${tableName}" (${quoted}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      vals as unknown[],
    );
    n += 1;
  }
  return n;
}

async function migrateExtendedOnly(sourceUrl: string, targetUrl: string) {
  const src = new Client({ connectionString: sourceUrl });
  const dst = new Client({ connectionString: targetUrl });
  await src.connect();
  await dst.connect();
  try {
    await dst.query("BEGIN");
    for (const t of EXTENDED_TABLE_ORDER) {
      const dstHas = await dst.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [t],
      );
      if (dstHas.rows.length === 0) {
        console.warn(`Destino sem tabela "${t}" — ignorada (corre migração SQL de paridade primeiro).`);
        continue;
      }
      const n = await copyTableOnConflictDoNothing(src, dst, t);
      console.log(`${t}: ${n} linhas processadas na origem (INSERT … ON CONFLICT DO NOTHING).`);
    }

    // Merge campos extra nas tabelas core (mantém contas já criadas no EU)
    const { rows: urows } = await src.query(
      `SELECT id, "avatarUrl" FROM "User" WHERE "avatarUrl" IS NOT NULL AND "avatarUrl" <> ''`,
    );
    for (const r of urows) {
      await dst.query(
        `UPDATE "User" SET "avatarUrl" = COALESCE("avatarUrl", $2) WHERE id = $1`,
        [r.id, r.avatarUrl],
      );
    }
    console.log(`User: merge avatarUrl em ${urows.length} linhas (com URL na origem).`);

    const stuCols = [
      "planId",
      "primaryModality",
      "stripeCustomerId",
      "stripeSubscriptionId",
      "can_create_courses",
      "paymentGraceEndsAt",
      "paymentGraceReferenceMonth",
      "paymentSuspendedAt",
      "suspendedPlanId",
      "adminGrantedFullAccess",
    ];
    const dstStudent = await pgTableColumns(dst, "Student");
    const srcStudent = await pgTableColumns(src, "Student");
    const stuUse = stuCols.filter((c) => dstStudent.has(c) && srcStudent.has(c));
    if (stuUse.length > 0) {
      const q = `SELECT id, ${stuUse.map((c) => `"${c}"`).join(", ")} FROM "Student"`;
      const { rows: srows } = await src.query(q);
      for (const r of srows) {
        const sets = stuUse
          .map((c, i) => {
            const p = i + 2;
            if (c === "can_create_courses" || c === "adminGrantedFullAccess") {
              return `"${c}" = COALESCE("${c}", $${p}::boolean)`;
            }
            return `"${c}" = COALESCE("${c}", $${p})`;
          })
          .join(", ");
        const vals = [r.id, ...stuUse.map((c) => (r as Record<string, unknown>)[c])];
        await dst.query(`UPDATE "Student" SET ${sets} WHERE id = $1`, vals as unknown[]);
      }
      console.log(`Student: merge ${stuUse.length} colunas em ${srows.length} linhas.`);
    }

    const planCols = [
      "stripePriceId",
      "includes_performance_tracking",
      "includes_check_in",
      "max_check_ins_per_day",
      "includes_exclusive_benefits",
    ];
    const dstPlan = await pgTableColumns(dst, "Plan");
    const srcPlan = await pgTableColumns(src, "Plan");
    const planUse = planCols.filter((c) => dstPlan.has(c) && srcPlan.has(c));
    if (planUse.length > 0) {
      const q = `SELECT id, ${planUse.map((c) => `"${c}"`).join(", ")} FROM "Plan"`;
      const { rows: prows } = await src.query(q);
      for (const r of prows) {
        const sets = planUse
          .map((c, i) => {
            const p = i + 2;
            if (c === "max_check_ins_per_day") {
              return `"${c}" = COALESCE("${c}", $${p}::integer)`;
            }
            if (c.startsWith("includes_")) {
              return `"${c}" = COALESCE("${c}", $${p}::boolean)`;
            }
            return `"${c}" = COALESCE("${c}", $${p})`;
          })
          .join(", ");
        const vals = [r.id, ...planUse.map((c) => (r as Record<string, unknown>)[c])];
        await dst.query(`UPDATE "Plan" SET ${sets} WHERE id = $1`, vals as unknown[]);
      }
      console.log(`Plan: merge ${planUse.length} colunas em ${prows.length} linhas.`);
    }

    const coachCols = ["hourly_rate", "is_active", "phone", "date_of_birth"] as const;
    const dstCoach = await pgTableColumns(dst, "Coach");
    const srcCoach = await pgTableColumns(src, "Coach");
    const coachUse = coachCols.filter((c) => dstCoach.has(c) && srcCoach.has(c));
    if (coachUse.length > 0) {
      const q = `SELECT id, ${coachUse.map((c) => `"${c}"`).join(", ")} FROM "Coach"`;
      const { rows: crows } = await src.query(q);
      for (const r of crows) {
        const sets = coachUse
          .map((c, i) => `"${c}" = COALESCE("Coach"."${c}", $${i + 2})`)
          .join(", ");
        const vals = [r.id, ...coachUse.map((c) => (r as Record<string, unknown>)[c])];
        await dst.query(
          `UPDATE "Coach" SET ${sets} FROM (SELECT 1) AS _ WHERE "Coach".id = $1`,
          vals as unknown[],
        );
      }
      console.log(`Coach: merge ${coachUse.length} colunas em ${crows.length} linhas.`);
    }

    const lessonCols = ["weekday", "locationId"] as const;
    const dstLesson = await pgTableColumns(dst, "Lesson");
    const srcLesson = await pgTableColumns(src, "Lesson");
    const lessonUse = lessonCols.filter((c) => dstLesson.has(c) && srcLesson.has(c));
    if (lessonUse.length > 0) {
      const q = `SELECT id, ${lessonUse.map((c) => `"${c}"`).join(", ")} FROM "Lesson"`;
      const { rows: lrows } = await src.query(q);
      for (const r of lrows) {
        const sets = lessonUse
          .map((c, i) => {
            const p = i + 2;
            if (c === "weekday") return `"${c}" = COALESCE("${c}", $${p}::integer)`;
            return `"${c}" = COALESCE("${c}", $${p})`;
          })
          .join(", ");
        const vals = [r.id, ...lessonUse.map((c) => (r as Record<string, unknown>)[c])];
        await dst.query(`UPDATE "Lesson" SET ${sets} WHERE id = $1`, vals as unknown[]);
      }
      console.log(`Lesson: merge ${lessonUse.length} colunas em ${lrows.length} linhas.`);
    }

    const attCols = ["checkedInAt", "rpe", "rpeRecordedAt", "countsForGamification"] as const;
    const dstAtt = await pgTableColumns(dst, "Attendance");
    const srcAtt = await pgTableColumns(src, "Attendance");
    const attUse = attCols.filter((c) => dstAtt.has(c) && srcAtt.has(c));
    if (attUse.length > 0) {
      const q = `SELECT id, ${attUse.map((c) => `"${c}"`).join(", ")} FROM "Attendance"`;
      const { rows: arows } = await src.query(q);
      for (const r of arows) {
        const sets = attUse
          .map((c, i) => {
            const p = i + 2;
            if (c === "countsForGamification") {
              return `"${c}" = COALESCE("${c}", $${p}::boolean)`;
            }
            if (c === "rpe") return `"${c}" = COALESCE("${c}", $${p}::smallint)`;
            return `"${c}" = COALESCE("${c}", $${p})`;
          })
          .join(", ");
        const vals = [r.id, ...attUse.map((c) => (r as Record<string, unknown>)[c])];
        await dst.query(`UPDATE "Attendance" SET ${sets} WHERE id = $1`, vals as unknown[]);
      }
      console.log(`Attendance: merge ${attUse.length} colunas em ${arows.length} linhas.`);
    }

    await dst.query("COMMIT");
    console.log("Migração --extended-only concluída.");
  } catch (e) {
    await dst.query("ROLLBACK");
    throw e;
  } finally {
    await src.end();
    await dst.end();
  }
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

  if (process.argv.includes("--extended-only")) {
    await migrateExtendedOnly(sourceUrl, targetUrl);
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

    // 2. User (colunas extra se existirem na origem e no destino, ex.: avatarUrl)
    {
      const srcCols = await pgTableColumns(src, "User");
      const dstCols = await pgTableColumns(dst, "User");
      const userExtras = ["avatarUrl"].filter((c) => srcCols.has(c) && dstCols.has(c));
      const userCols = ["id", "authUserId", "email", "name", "role", "createdAt", ...userExtras];
      const quoted = userCols.map((c) => `"${c}"`).join(", ");
      const { rows } = await src.query(`SELECT ${quoted} FROM "User"`);
      const placeholders = userCols
        .map((c, i) => (c === "role" ? `$${i + 1}::"Role"` : `$${i + 1}`))
        .join(", ");
      for (const r of rows) {
        const values = userCols.map((c) => (r as Record<string, unknown>)[c]);
        await dst.query(
          `INSERT INTO "User" (${quoted}) VALUES (${placeholders})`,
          values as unknown[],
        );
      }
      console.log(`User: ${rows.length}${userExtras.length ? ` (extras: ${userExtras.join(", ")})` : ""}`);
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

    // 4. Student (planId, Stripe, grace, etc. se existirem em ambas as BD)
    {
      const srcCols = await pgTableColumns(src, "Student");
      const dstCols = await pgTableColumns(dst, "Student");
      const studentOptional = [
        "planId",
        "primaryModality",
        "stripeSubscriptionId",
        "adminGrantedFullAccess",
        "paymentGraceEndsAt",
        "paymentGraceReferenceMonth",
        "paymentSuspendedAt",
        "suspendedPlanId",
      ];
      const studentExtras = studentOptional.filter((c) => srcCols.has(c) && dstCols.has(c));
      const studentCols = ["id", "userId", "schoolId", "status", "createdAt", ...studentExtras];
      const quoted = studentCols.map((c) => `"${c}"`).join(", ");
      const { rows } = await src.query(`SELECT ${quoted} FROM "Student"`);
      const placeholders = studentCols
        .map((c, i) => (c === "status" ? `$${i + 1}::"StudentStatus"` : `$${i + 1}`))
        .join(", ");
      for (const r of rows) {
        const values = studentCols.map((c) => (r as Record<string, unknown>)[c]);
        await dst.query(
          `INSERT INTO "Student" (${quoted}) VALUES (${placeholders})`,
          values as unknown[],
        );
      }
      console.log(`Student: ${rows.length}${studentExtras.length ? ` (extras: ${studentExtras.join(", ")})` : ""}`);
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

    // 12. Attendance (occurrenceDate obrigatório no destino alargado)
    {
      const srcA = await pgTableColumns(src, "Attendance");
      const dstA = await pgTableColumns(dst, "Attendance");
      const opt = (["checkedInAt", "rpe", "rpeRecordedAt", "countsForGamification"] as const).filter(
        (c) => srcA.has(c) && dstA.has(c),
      );
      const optSelect = opt.map((c) => `a."${c}"`).join(", ");
      const selectSql = `
        SELECT a.id, a."lessonId", a."studentId", a.status, a."isExperimental", a."createdAt",
               COALESCE(a."occurrenceDate", l."date"::date) AS "occurrenceDate"
               ${opt.length ? `, ${optSelect}` : ""}
        FROM "Attendance" a
        LEFT JOIN "Lesson" l ON l.id = a."lessonId"
      `;
      const insertCols = [
        "id",
        "lessonId",
        "studentId",
        "status",
        "isExperimental",
        "createdAt",
        "occurrenceDate",
        ...opt,
      ] as const;
      const quotedIns = insertCols.map((c) => `"${c}"`).join(", ");
      const { rows } = await src.query(selectSql);
      const placeholders = insertCols
        .map((c, i) => {
          const p = i + 1;
          if (c === "status") return `$${p}::"AttendanceStatus"`;
          if (c === "occurrenceDate") return `$${p}::date`;
          if (c === "rpe") return `$${p}::smallint`;
          if (c === "countsForGamification") return `$${p}::boolean`;
          return `$${p}`;
        })
        .join(", ");
      for (const r of rows) {
        const vals = insertCols.map((c) => (r as Record<string, unknown>)[c]);
        await dst.query(
          `INSERT INTO "Attendance" (${quotedIns}) VALUES (${placeholders})`,
          vals as unknown[],
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
