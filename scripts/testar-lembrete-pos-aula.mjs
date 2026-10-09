/**
 * Testa o lembrete «Como foi o treino?» (função SQL send_post_class_rpe_prompts) na base de dados real,
 * dentro de uma transação que é SEMPRE desfeita no fim (ROLLBACK): não grava nada.
 * Simula a hora em relação ao fim de uma aula recente com presenças confirmadas.
 * Uso: npm run testar:lembrete
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config({ path: ".env" });
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL em falta no .env.");
  process.exit(1);
}

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
let failed = false;
const check = (label, got, expected) => {
  const ok = expected(got);
  if (!ok) failed = true;
  console.log(`${ok ? "✓" : "✗"} ${label}: ${got}`);
};

try {
  await c.query("BEGIN");
  const {
    rows: [occ],
  } = await c.query(`
    SELECT a."occurrenceDate"::text AS d, l."endTime", COALESCE(m.name, l.modality) AS modality,
           COUNT(*) FILTER (WHERE a.rpe IS NULL OR a."rpeSource" = 'COACH')::int AS sem_nota
    FROM "Attendance" a
    JOIN "Lesson" l ON l.id = a."lessonId"
    LEFT JOIN "ModalityRef" m ON m.code = l.modality
    WHERE a.status::text = 'CONFIRMED' AND NOT a."isExperimental" AND l."endTime" ~ '^\\d{1,2}:\\d{2}'
    GROUP BY 1, 2, 3
    HAVING COUNT(*) FILTER (WHERE a.rpe IS NULL OR a."rpeSource" = 'COACH') > 0
    ORDER BY 1 DESC, 4 DESC
    LIMIT 1`);
  if (!occ) throw new Error("SEM_AULA");
  // Começa sem lembretes já enviados, para o resultado não depender do cron real (desfeito no ROLLBACK).
  await c.query(`DELETE FROM "Notification" WHERE type = 'RPE_PROMPT'`);
  console.log(`Aula de teste: ${occ.modality}, ${occ.d}, acaba às ${occ.endTime} · ${occ.sem_nota} presentes sem nota própria\n`);

  const at = async (minutesAfterEnd) => {
    const {
      rows: [r],
    } = await c.query(
      `SELECT public.send_post_class_rpe_prompts((($1::date + ($2::text)::time + make_interval(mins => $3)) AT TIME ZONE 'Europe/Lisbon')) AS n`,
      [occ.d, occ.endTime.slice(0, 5), minutesAfterEnd]
    );
    return r.n;
  };

  check("20 min depois do fim (cedo demais, espera-se 0)", await at(20), (n) => n === 0);
  const sent = await at(45);
  check(`45 min depois (espera-se 1 a ${occ.sem_nota})`, sent, (n) => n >= 1 && n <= occ.sem_nota);
  check("50 min depois (não repete, espera-se 0)", await at(50), (n) => n === 0);
  check("200 min depois (tarde demais, espera-se 0)", await at(200), (n) => n === 0);

  const { rows } = await c.query(`SELECT body FROM "Notification" WHERE type = 'RPE_PROMPT' LIMIT 1`);
  if (rows[0]) console.log(`\nExemplo de notificação: «Como foi o treino?» — ${rows[0].body}`);
} catch (e) {
  if (e instanceof Error && e.message === "SEM_AULA") console.log("Não há nenhuma aula com presenças sem nota para testar.");
  else throw e;
} finally {
  await c.query("ROLLBACK");
  await c.end();
}

console.log(failed ? "\nResultado: ✗ algo não bate certo — copia o que aparece acima para o Claude." : "\nResultado: ✓ tudo certo (nada foi gravado na base de dados).");
process.exit(failed ? 1 : 0);
