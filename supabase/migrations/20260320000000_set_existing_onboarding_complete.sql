-- Utilizadores existentes (criados antes do onboarding) não devem ser forçados a passar pelo wizard
UPDATE "StudentProfile" SET "hasCompletedOnboarding" = true WHERE "hasCompletedOnboarding" = false;
