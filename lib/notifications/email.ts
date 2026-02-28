/**
 * Envio de emails transacionais (Resend).
 * Usado para: confirmação de presença, lembrete de aulas.
 */

const MODALITY_LABELS: Record<string, string> = {
  MUAY_THAI: "Muay Thai",
  BOXING: "Boxing",
  KICKBOXING: "Kickboxing",
};

function getFrom(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (from) return from;
  return "Kingdom Fight School <onboarding@resend.dev>";
}

export type LessonInfo = {
  modality: string;
  date: string;
  startTime: string;
  endTime: string;
};

/**
 * Envia email de confirmação de presença (quando o coach confirma).
 */
export async function sendCheckInConfirmation(
  to: string,
  studentName: string | null,
  lesson: LessonInfo
): Promise<{ error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY não definida; email de confirmação não enviado.");
    return {};
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const modalityLabel = MODALITY_LABELS[lesson.modality] ?? lesson.modality;
    const dateFormatted = formatDateForEmail(lesson.date);

    const { error } = await resend.emails.send({
      from: getFrom(),
      to: [to],
      subject: "Presença confirmada – Kingdom Fight School",
      html: `
        <p>Olá${studentName ? ` ${studentName}` : ""},</p>
        <p>A tua presença na aula de <strong>${modalityLabel}</strong> foi confirmada.</p>
        <p><strong>${dateFormatted}</strong>, ${lesson.startTime} – ${lesson.endTime}.</p>
        <p>Até lá! 👊</p>
        <p style="color:#666;font-size:12px;">Kingdom Fight School</p>
      `.trim(),
    });

    if (error) {
      console.error("sendCheckInConfirmation error:", error);
      return { error: String(error.message ?? error) };
    }
    return {};
  } catch (e) {
    console.error("sendCheckInConfirmation exception:", e);
    return { error: e instanceof Error ? e.message : "Erro ao enviar email." };
  }
}

/**
 * Envia lembrete de aulas (resumo do dia seguinte).
 */
export async function sendLessonReminder(
  to: string,
  studentName: string | null,
  lessons: LessonInfo[]
): Promise<{ error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY não definida; email de lembrete não enviado.");
    return {};
  }

  if (lessons.length === 0) return {};

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const listItems = lessons
      .map(
        (l) =>
          `<li><strong>${MODALITY_LABELS[l.modality] ?? l.modality}</strong> – ${formatDateForEmail(l.date)}, ${l.startTime} – ${l.endTime}</li>`
      )
      .join("");

    const { error } = await resend.emails.send({
      from: getFrom(),
      to: [to],
      subject: "Lembrete: aulas de amanhã – Kingdom Fight School",
      html: `
        <p>Olá${studentName ? ` ${studentName}` : ""},</p>
        <p>Lembrete das aulas de amanhã:</p>
        <ul>${listItems}</ul>
        <p>Até lá! 👊</p>
        <p style="color:#666;font-size:12px;">Kingdom Fight School</p>
      `.trim(),
    });

    if (error) {
      console.error("sendLessonReminder error:", error);
      return { error: String(error.message ?? error) };
    }
    return {};
  } catch (e) {
    console.error("sendLessonReminder exception:", e);
    return { error: e instanceof Error ? e.message : "Erro ao enviar email." };
  }
}

function formatDateForEmail(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-PT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return dateStr;
  }
}
