-- Pedidos de avaliação física: o aluno solicita; professores da mesma escola veem na área coach.

CREATE TYPE "PhysicalAssessmentRequestStatus" AS ENUM ('PENDING', 'CANCELLED', 'FULFILLED');

CREATE TABLE "PhysicalAssessmentRequest" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "status" "PhysicalAssessmentRequestStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "fulfilledAt" TIMESTAMPTZ,
  CONSTRAINT "PhysicalAssessmentRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PhysicalAssessmentRequest_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PhysicalAssessmentRequest_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PhysicalAssessmentRequest_one_pending_per_student"
  ON "PhysicalAssessmentRequest" ("studentId")
  WHERE "status" = 'PENDING';

CREATE INDEX "PhysicalAssessmentRequest_schoolId_status_idx"
  ON "PhysicalAssessmentRequest" ("schoolId", "status");

ALTER TABLE "PhysicalAssessmentRequest" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_authenticated" ON "PhysicalAssessmentRequest"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
