-- Notificações para professores (central coach): recipient via coachUserId (User.id do coach).

ALTER TABLE "Notification" ALTER COLUMN "studentId" DROP NOT NULL;

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "coachUserId" TEXT;

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_coachUserId_fkey";
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_coachUserId_fkey"
  FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_recipient_xor";

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_recipient_xor" CHECK (
    ("studentId" IS NOT NULL AND "coachUserId" IS NULL)
    OR ("studentId" IS NULL AND "coachUserId" IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS "Notification_coachUserId_created_at_idx"
  ON "Notification" ("coachUserId", "created_at" DESC NULLS LAST);
