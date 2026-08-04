import { createStudentPresencial } from "@/app/admin/alunos/actions";

type PromptBase =
  | { type: "text"; question: string; placeholder?: string }
  | { type: "choice"; question: string; options: { label: string; value: string }[] };

export type ChatPrompt = PromptBase & { error?: string };

export type FlowResult =
  | { kind: "error"; message: string }
  | {
      kind: "credentials";
      studentId: string;
      loginEmail: string;
      initialPassword: string | null;
      synthetic: boolean;
    };

export type FlowContext = {
  schools: { id: string; name: string }[];
};

/** Generator assíncrono: cada `yield` é uma pergunta; o valor recebido de volta é a resposta do admin. */
export type ChatFlow = AsyncGenerator<ChatPrompt, FlowResult, string>;

function isValidDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
}

async function* askUntilValid(
  base: PromptBase,
  isValid: (answer: string) => boolean,
  errorMessage: string
): AsyncGenerator<ChatPrompt, string, string> {
  let error: string | undefined;
  for (;;) {
    const answer: string = yield { ...base, error } as ChatPrompt;
    if (isValid(answer)) return answer.trim();
    error = errorMessage;
  }
}

async function* askSchoolIfNeeded(ctx: FlowContext): AsyncGenerator<ChatPrompt, string, string> {
  if (ctx.schools.length === 1) return ctx.schools[0]!.id;
  if (ctx.schools.length === 0) return "";
  const answer = yield* askUntilValid(
    {
      type: "choice",
      question: "Qual escola?",
      options: ctx.schools.map((s) => ({ label: s.name, value: s.id })),
    },
    (a) => ctx.schools.some((s) => s.id === a),
    "Escolhe uma das escolas da lista."
  );
  return answer;
}

/**
 * Cadastro presencial (aluno adulto ou menor) — a demonstração principal do conceito:
 * o assistente pergunta campo a campo e chama a mesma server action do formulário normal.
 * Não usamos redirect() no fim (createStudentPresencial devolve o resultado directamente),
 * ao contrário de createStudent (convite), que faz redirect() e por isso não é seguro
 * chamar directamente a partir do widget de chat.
 */
export async function* cadastroPresencialFlow(ctx: FlowContext): ChatFlow {
  const name = yield* askUntilValid(
    { type: "text", question: "Qual o nome completo do aluno?" },
    (a) => a.trim().length >= 2,
    "Indica o nome completo (mínimo 2 caracteres)."
  );

  const schoolId = yield* askSchoolIfNeeded(ctx);

  const isMinorAnswer = yield* askUntilValid(
    {
      type: "choice",
      question: "É menor de idade?",
      options: [
        { label: "Sim", value: "sim" },
        { label: "Não", value: "nao" },
      ],
    },
    (a) => a === "sim" || a === "nao",
    "Escolhe Sim ou Não."
  );
  const isMinor = isMinorAnswer === "sim";

  const formData = new FormData();
  formData.set("name", name);
  formData.set("schoolId", schoolId);

  if (isMinor) {
    formData.set("isMinor", "true");

    const dateOfBirth = yield* askUntilValid(
      { type: "text", question: "Data de nascimento? (AAAA-MM-DD)", placeholder: "2014-05-10" },
      isValidDate,
      "Usa o formato AAAA-MM-DD, por exemplo 2014-05-10."
    );
    const guardianName = yield* askUntilValid(
      { type: "text", question: "Nome do responsável legal?" },
      (a) => a.trim().length >= 3,
      "Indica o nome do responsável (mínimo 3 caracteres)."
    );
    const guardianPhone = yield* askUntilValid(
      { type: "text", question: "Telefone do responsável?", placeholder: "+351..." },
      (a) => a.trim().length >= 6,
      "Indica um telefone válido."
    );

    formData.set("dateOfBirth", dateOfBirth);
    formData.set("guardianName", guardianName);
    formData.set("guardianPhone", guardianPhone);
  } else {
    const email = yield* askUntilValid(
      { type: "text", question: "Email do aluno?", placeholder: "email da ficha de inscrição" },
      (a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.trim()),
      "Indica um email válido."
    );
    formData.set("email", email);
  }

  formData.set("autoGeneratePassword", "true");

  const result = await createStudentPresencial(null, formData);
  if (result.error) {
    return { kind: "error", message: result.error };
  }
  return {
    kind: "credentials",
    studentId: result.studentId!,
    loginEmail: result.loginEmail!,
    initialPassword: result.initialPassword ?? null,
    synthetic: Boolean(result.syntheticLoginEmail),
  };
}
