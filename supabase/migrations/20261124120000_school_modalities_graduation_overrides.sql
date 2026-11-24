-- Configuração híbrida (rede + ajustes por escola) — fase 1: modalidades e graduação.
-- Decisões de 2026-11-24 (DOCS/mockup-configuracao-hibrida.html):
--  * a escola liga/desliga as modalidades da rede e pode criar modalidades próprias;
--  * modalidades próprias contam só no ranking da escola; «Propor à rede» → o Admin Geral aprova
--    (schoolId passa a NULL) e alunos/graus mantêm-se;
--  * na graduação a escola ajusta tempo e presenças mínimas (±25 % da rede) e só sobe a nota mínima.
-- Escritas feitas pelo servidor (service role); leitura aberta a utilizadores autenticados (dados não sensíveis).

-- 1) Modalidades próprias de uma escola (NULL = modalidade da rede).
alter table "ModalityRef"
  add column if not exists "schoolId" text references "School"("id") on delete cascade on update cascade,
  add column if not exists "networkProposalAt" timestamptz;

create index if not exists "ModalityRef_schoolId_idx" on "ModalityRef" ("schoolId") where "schoolId" is not null;

comment on column "ModalityRef"."schoolId" is 'Modalidade só desta escola; NULL = modalidade da rede.';
comment on column "ModalityRef"."networkProposalAt" is 'Quando o diretor propôs passar a modalidade da escola para a rede (NULL = sem proposta).';

-- 2) Modalidades da rede que uma escola NÃO oferece (sem linha = oferece; assim nada muda para as escolas atuais).
create table if not exists "SchoolModalityDisabled" (
  "schoolId" text not null references "School"("id") on delete cascade on update cascade,
  "modalityCode" text not null references "ModalityRef"("code") on delete cascade on update cascade,
  "updatedByUserId" text references "User"("id") on delete set null on update cascade,
  "createdAt" timestamptz not null default now(),
  primary key ("schoolId", "modalityCode")
);

alter table "SchoolModalityDisabled" enable row level security;
drop policy if exists "SchoolModalityDisabled_read" on "SchoolModalityDisabled";
create policy "SchoolModalityDisabled_read" on "SchoolModalityDisabled" for select to authenticated using (true);

-- 3) Ajustes da escola aos requisitos de cada grau (NULL = valor da rede). Limites validados no servidor.
create table if not exists "SchoolGraduationGradeOverride" (
  "schoolId" text not null references "School"("id") on delete cascade on update cascade,
  "gradeId" text not null references "GraduationGrade"("id") on delete cascade on update cascade,
  "minMonths" integer check ("minMonths" is null or "minMonths" >= 0),
  "minAttendances" integer check ("minAttendances" is null or "minAttendances" >= 0),
  "minPerformanceAvg" numeric(4, 2) check ("minPerformanceAvg" is null or "minPerformanceAvg" between 1 and 5),
  "updatedByUserId" text references "User"("id") on delete set null on update cascade,
  "updatedAt" timestamptz not null default now(),
  primary key ("schoolId", "gradeId")
);

alter table "SchoolGraduationGradeOverride" enable row level security;
drop policy if exists "SchoolGraduationGradeOverride_read" on "SchoolGraduationGradeOverride";
create policy "SchoolGraduationGradeOverride_read" on "SchoolGraduationGradeOverride" for select to authenticated using (true);
