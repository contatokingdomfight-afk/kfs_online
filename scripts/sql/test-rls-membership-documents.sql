-- Testa a RLS de StudentMembershipAgreement e StudentWaiver: com a sessão, o aluno A só lê a sua linha e não escreve em nenhuma.
-- Corre no SQL Editor do Supabase. Termina em ROLLBACK: não fica nada alterado.
-- Sucesso = termina sem erro. Falha = erro «FALHOU: ...» a dizer qual o teste.
-- Para ensaiar antes de aplicar: colar 20261031160000_rls_membership_documents.sql a seguir ao BEGIN.

BEGIN;

DO $test$
DECLARE
  a_id text;
  a_auth text;
  b_id text;
  n int;
  tbl text;
BEGIN
  SELECT s.id, u."authUserId" INTO a_id, a_auth
  FROM public."Student" s
  JOIN public."User" u ON u.id = s."userId"
  JOIN public."StudentMembershipAgreement" m ON m."studentId" = s.id
  JOIN public."StudentWaiver" w ON w."studentId" = s.id
  WHERE u.role = 'ALUNO' AND u."authUserId" IS NOT NULL
  ORDER BY s."createdAt"
  LIMIT 1;

  SELECT s.id INTO b_id
  FROM public."Student" s
  JOIN public."StudentMembershipAgreement" m ON m."studentId" = s.id
  JOIN public."StudentWaiver" w ON w."studentId" = s.id
  WHERE s.id <> a_id
  ORDER BY s."createdAt"
  LIMIT 1;

  IF a_id IS NULL OR b_id IS NULL THEN
    RAISE EXCEPTION 'FALHOU: faltam dois alunos com contrato e termo para testar';
  END IF;

  -- A partir daqui, tudo corre como o aluno A autenticado.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a_auth, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  FOREACH tbl IN ARRAY ARRAY['StudentMembershipAgreement', 'StudentWaiver']
  LOOP
    -- Leitura
    EXECUTE format('SELECT count(*) FROM public.%I', tbl) INTO n;
    IF n <> 1 THEN RAISE EXCEPTION 'FALHOU: % — A vê % linhas (esperado: só a sua)', tbl, n; END IF;

    EXECUTE format('SELECT count(*) FROM public.%I WHERE "studentId" = $1', tbl) INTO n USING a_id;
    IF n <> 1 THEN RAISE EXCEPTION 'FALHOU: % — A não vê a sua linha', tbl; END IF;

    EXECUTE format('SELECT count(*) FROM public.%I WHERE "studentId" = $1', tbl) INTO n USING b_id;
    IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: % — A lê a linha de B', tbl; END IF;

    -- Alterar e apagar não apanha nenhuma linha, nem a de B nem a própria
    EXECUTE format('UPDATE public.%I SET "signatureName" = ''forjado'' WHERE "studentId" = $1', tbl) USING b_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: % — A altera a linha de B', tbl; END IF;

    EXECUTE format('UPDATE public.%I SET "signatureName" = ''forjado'' WHERE "studentId" = $1', tbl) USING a_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: % — A altera a sua linha com a sessão', tbl; END IF;

    EXECUTE format('DELETE FROM public.%I WHERE "studentId" = $1', tbl) USING b_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: % — A apaga a linha de B', tbl; END IF;

    EXECUTE format('DELETE FROM public.%I WHERE "studentId" = $1', tbl) USING a_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: % — A apaga a sua linha', tbl; END IF;

    -- Criar linhas é recusado pela RLS (42501), antes do UNIQUE, em nome de B e em nome próprio
    BEGIN
      EXECUTE format('INSERT INTO public.%I ("id", "studentId") VALUES (gen_random_uuid()::text, $1)', tbl) USING b_id;
      RAISE EXCEPTION 'FALHOU: % — A cria uma linha em nome de B', tbl;
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;

    BEGIN
      EXECUTE format('INSERT INTO public.%I ("id", "studentId") VALUES (gen_random_uuid()::text, $1)', tbl) USING a_id;
      RAISE EXCEPTION 'FALHOU: % — A cria uma linha em nome próprio com a sessão', tbl;
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END LOOP;

  -- Sem sessão não se vê nada
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('role', 'anon', true);
  FOREACH tbl IN ARRAY ARRAY['StudentMembershipAgreement', 'StudentWaiver']
  LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', tbl) INTO n;
      IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: % — anónimo vê % linhas', tbl, n; END IF;
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END LOOP;
END
$test$;

ROLLBACK;
