-- Tribo (comunidade) MVP: posts, media, comentários, curtidas.
-- Escrita/leitura na app via server com service role onde aplicável; RLS activa (sem políticas) = nega acesso directo com JWT anon às tabelas (service role ignora).

DO $$ BEGIN
  CREATE TYPE "TribePostVisibility" AS ENUM ('SCHOOL_ONLY', 'ALL_SCHOOLS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TribePostStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'DELETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TribeCommentStatus" AS ENUM ('ACTIVE', 'HIDDEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TribePost" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "schoolId" TEXT NOT NULL REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "authorUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "body" TEXT NOT NULL,
  "visibility" "TribePostVisibility" NOT NULL DEFAULT 'SCHOOL_ONLY',
  "status" "TribePostStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "hiddenAt" TIMESTAMPTZ,
  "hiddenByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TribePost_school_created_idx" ON "TribePost" ("schoolId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "TribePost_visibility_status_created_idx" ON "TribePost" ("visibility", "status", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "TribePostMedia" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "postId" TEXT NOT NULL REFERENCES "TribePost"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "publicUrl" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "TribePostMedia_postId_idx" ON "TribePostMedia" ("postId");

CREATE TABLE IF NOT EXISTS "TribeComment" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "postId" TEXT NOT NULL REFERENCES "TribePost"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "authorUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "body" TEXT NOT NULL,
  "status" "TribeCommentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "TribeComment_post_created_idx" ON "TribeComment" ("postId", "createdAt");

CREATE TABLE IF NOT EXISTS "TribeLike" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "postId" TEXT NOT NULL REFERENCES "TribePost"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "TribeLike_postId_userId_key" UNIQUE ("postId", "userId")
);

CREATE INDEX IF NOT EXISTS "TribeLike_postId_idx" ON "TribeLike" ("postId");

ALTER TABLE "TribePost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TribePostMedia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TribeComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TribeLike" ENABLE ROW LEVEL SECURITY;

-- Bucket público (leitura); escrita só service role (API / server actions).
INSERT INTO storage.buckets (id, name, public)
VALUES ('tribe-media', 'tribe-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "tribe_media_select_public" ON storage.objects;
CREATE POLICY "tribe_media_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tribe-media');

COMMENT ON TABLE "TribePost" IS 'Tribo: publicações; visibility SCHOOL_ONLY vs ALL_SCHOOLS.';
COMMENT ON COLUMN "TribePost"."visibility" IS 'SCHOOL_ONLY: só alunos da mesma schoolId; ALL_SCHOOLS: todos os alunos activos.';
