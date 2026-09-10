-- offerTrialBooking agora também controla a lista de aulas disponíveis em "Nova inscrição" (admin/experimentais/novo),
-- além do formulário público /aula-experimental. Só o comentário muda — a coluna já existe.
COMMENT ON COLUMN "Lesson"."offerTrialBooking" IS 'Quando false, a aula não aparece nas opções de aula experimental: nem no agendamento público (/aula-experimental) nem em "Nova inscrição" no admin.';
