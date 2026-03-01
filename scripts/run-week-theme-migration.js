/**
 * Executa a migration WeekTheme no Supabase.
 * Usa DATABASE_URL do .env
 * 
 * Uso: node scripts/run-week-theme-migration.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "WeekTheme" (
    "modality" TEXT NOT NULL,
    "week_start" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "course_id" TEXT,
    "video_url" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("modality", "week_start")
  )`,
  `ALTER TABLE "WeekTheme" DROP CONSTRAINT IF EXISTS "WeekTheme_course_id_fkey"`,
  `ALTER TABLE "WeekTheme" ADD CONSTRAINT "WeekTheme_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE SET NULL`,
  `ALTER TABLE "WeekTheme" ADD COLUMN IF NOT EXISTS "video_url" TEXT`,
  `CREATE INDEX IF NOT EXISTS "WeekTheme_week_start_idx" ON "WeekTheme"("week_start")`,
];

async function main() {
  try {
    for (const sql of STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e) {
        if (e.code === "42710") return; // duplicate object, ignore
        if (e.message?.includes("already exists")) return;
        throw e;
      }
    }
    console.log("✓ Tabela WeekTheme criada com sucesso.");
  } catch (err) {
    console.error("Erro:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
