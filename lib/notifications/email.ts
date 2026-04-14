/**
 * Envio de emails transacionais (Resend).
 * Usado para: confirmação de presença, lembrete de aulas.
 */

const MODALITY_LABELS: Record<string, string> = {
  MUAY_THAI: "Muay Thai",
  BOXING: "Boxing",
  KICKBOXING: "Kickboxing",
  MMA: "MMA",
};

/** Cor primária da marca (alinhada com app/globals.css) — usar inline nos emails. */
const BRAND_PRIMARY = "#c1121f";

function getFrom(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (from) return from;
  return "Kingdom Fight School <onboarding@resend.dev>";
}

/**
 * Layout HTML simples e compatível com clientes de email (estilos inline).
 */
function wrapTransactionalEmail(innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kingdom Fight School</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:${BRAND_PRIMARY};padding:20px 24px;text-align:center;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.02em;">Kingdom Fight School</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 32px;color:#18181b;font-size:16px;line-height:1.55;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;border-top:1px solid #e4e4e7;">
              <p style="margin:16px 0 0;color:#71717a;font-size:12px;line-height:1.5;text-align:center;">
                Este email foi enviado pela plataforma Kingdom Fight School.<br>
                Se não esperavas esta mensagem, podes ignorá-la com segurança.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    const greeting = studentName ? `Olá ${studentName}` : "Olá";
    const inner = `
        <p style="margin:0 0 16px;">${greeting},</p>
        <p style="margin:0 0 16px;">A tua presença na aula de <strong style="color:${BRAND_PRIMARY};">${modalityLabel}</strong> foi confirmada.</p>
        <p style="margin:0 0 8px;padding:14px 16px;background-color:#fafafa;border-radius:8px;border-left:4px solid ${BRAND_PRIMARY};">
          <strong>${dateFormatted}</strong><br>
          <span style="color:#52525b;">${lesson.startTime} – ${lesson.endTime}</span>
        </p>
        <p style="margin:20px 0 0;">Até lá!</p>
    `.trim();
    const text = `${greeting},\n\nA tua presença na aula de ${modalityLabel} foi confirmada.\n${dateFormatted}, ${lesson.startTime} – ${lesson.endTime}.\n\nAté lá!\n\n— Kingdom Fight School`;

    const { error } = await resend.emails.send({
      from: getFrom(),
      to: [to],
      subject: "Presença confirmada – Kingdom Fight School",
      text,
      html: wrapTransactionalEmail(inner),
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
      .map((l) => {
        const label = MODALITY_LABELS[l.modality] ?? l.modality;
        const d = formatDateForEmail(l.date);
        return `<li style="margin:0 0 10px;padding:12px 14px;background-color:#fafafa;border-radius:8px;border-left:3px solid ${BRAND_PRIMARY};list-style:none;">
          <strong style="color:${BRAND_PRIMARY};">${label}</strong><br>
          <span style="color:#3f3f46;">${d}, ${l.startTime} – ${l.endTime}</span>
        </li>`;
      })
      .join("");

    const greeting = studentName ? `Olá ${studentName}` : "Olá";
    const inner = `
        <p style="margin:0 0 16px;">${greeting},</p>
        <p style="margin:0 0 16px;">Lembrete das <strong>aulas de amanhã</strong>:</p>
        <ul style="margin:0;padding:0;">${listItems}</ul>
        <p style="margin:20px 0 0;">Até lá!</p>
    `.trim();

    const textLines = lessons
      .map((l) => {
        const label = MODALITY_LABELS[l.modality] ?? l.modality;
        return `• ${label} – ${formatDateForEmail(l.date)}, ${l.startTime} – ${l.endTime}`;
      })
      .join("\n");
    const text = `${greeting},\n\nLembrete das aulas de amanhã:\n\n${textLines}\n\nAté lá!\n\n— Kingdom Fight School`;

    const { error } = await resend.emails.send({
      from: getFrom(),
      to: [to],
      subject: "Lembrete: aulas de amanhã – Kingdom Fight School",
      text,
      html: wrapTransactionalEmail(inner),
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
