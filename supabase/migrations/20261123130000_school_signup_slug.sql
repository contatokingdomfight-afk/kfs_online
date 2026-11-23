-- Link de inscrição com nome (multi-escola): /sign-up/escola/<slug>, ex.: kfs-lisboa.
-- O site de cada escola aponta para este link; o registo fica já com a escola escolhida.
alter table "School" add column if not exists "slug" text;

alter table "School" drop constraint if exists "School_slug_format";
alter table "School"
  add constraint "School_slug_format"
  check ("slug" is null or "slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length("slug") between 3 and 40);

create unique index if not exists "School_slug_key" on "School" ("slug") where "slug" is not null;

comment on column "School"."slug" is 'Nome curto do link de inscrição (/sign-up/escola/<slug>); minúsculas, números e hífenes.';
