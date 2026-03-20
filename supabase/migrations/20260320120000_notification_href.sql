-- Link opcional para abrir ecrã relevante a partir da central de notificações
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS href text;
