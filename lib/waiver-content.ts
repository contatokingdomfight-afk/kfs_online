/**
 * Termo de responsabilidade e isenção — texto exibido a alunos reais no fluxo de assinatura.
 * Nota interna (não exibida ao utilizador): este texto segue o mesmo padrão informal das
 * Condições Gerais de Adesão (lib/membership-agreement-content.ts); recomenda-se revisão
 * jurídica periódica, mas o aviso de "modelo" não deve ficar visível para o aluno.
 */
export const WAIVER_BODY_PT = `
<h2 style="font-size:1.125rem;font-weight:600;margin:0 0 12px;">Termo de responsabilidade e isenção</h2>
<p>Reconheço que a prática de artes marciais e actividades físicas associadas envolve riscos inerentes, incluindo lesões e, em casos extremamente raros, consequências graves.</p>
<p>Declaro estar em boas condições de saúde para participar nas actividades da Kingdom Fight School, comprometendo-me a informar a escola de qualquer alteração relevante.</p>
<p>Isento a Kingdom Fight School, os seus representantes e colaboradores de responsabilidade por lesões ou danos resultantes da participação nas actividades, excepto nos casos de negligência grave ou dolo imputável à escola.</p>
<p>Autorizo a prestação de primeiros socorros e tratamento de emergência em caso de necessidade durante a participação nas actividades.</p>
<p>Comprometo-me a respeitar as regras de conduta e segurança da escola.</p>
`.trim();

export function isMinorFromDateOfBirth(dateOfBirth: string | null | undefined, todayYmd: string): boolean {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return false;
  const birth = new Date(`${dateOfBirth}T12:00:00Z`);
  const today = new Date(`${todayYmd}T12:00:00Z`);
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const m = today.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < birth.getUTCDate())) age--;
  return age < 18;
}
