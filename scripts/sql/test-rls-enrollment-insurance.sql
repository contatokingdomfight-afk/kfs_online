-- Testa a RLS de StudentEnrollmentForm, StudentInsuranceCoverage e InsuranceSettings: o aluno A tenta ler e alterar o que não é dele.
-- Corre no SQL Editor do Supabase. Termina em ROLLBACK: não fica nada alterado.
-- Sucesso = termina sem erro. Falha = erro «FALHOU: ...» a dizer qual o teste.
-- Para ensaiar antes de aplicar: colar 20261031170000_rls_enrollment_insurance.sql a seguir ao BEGIN.

BEGIN;

DO $test$
DECLARE
  a_id text;
  a_auth text;
  b_id text;
  n int;
BEGIN
  SELECT s.id, u."authUserId" INTO a_id, a_auth
  FROM public."Student" s
  JOIN public."User" u ON u.id = s."userId"
  JOIN public."StudentEnrollmentForm" f ON f."studentId" = s.id
  JOIN public."StudentInsuranceCoverage" c ON c."studentId" = s.id
  WHERE u.role = 'ALUNO' AND u."authUserId" IS NOT NULL
  ORDER BY s."createdAt"
  LIMIT 1;

  SELECT s.id INTO b_id
  FROM public."Student" s
  JOIN public."StudentEnrollmentForm" f ON f."studentId" = s.id
  JOIN public."StudentInsuranceCoverage" c ON c."studentId" = s.id
  WHERE s.id <> a_id
  ORDER BY s."createdAt"
  LIMIT 1;

  IF a_id IS NULL OR b_id IS NULL THEN
    RAISE EXCEPTION 'FALHOU: faltam dois alunos com comprovativo e seguro para testar';
  END IF;

  -- Sem linha, para ensaiar a primeira submissão em /adesao.
  DELETE FROM public."StudentEnrollmentForm" WHERE "studentId" = a_id;

  -- A partir daqui, tudo corre como o aluno A autenticado.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a_auth, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- ===== StudentEnrollmentForm =====

  -- Submeter pela primeira vez (o que /adesao faz) continua a funcionar
  INSERT INTO public."StudentEnrollmentForm" ("studentId") VALUES (a_id);

  -- Leitura
  SELECT count(*) INTO n FROM public."StudentEnrollmentForm";
  IF n <> 1 THEN RAISE EXCEPTION 'FALHOU: comprovativo — A vê % linhas (esperado: só a sua)', n; END IF;

  SELECT count(*) INTO n FROM public."StudentEnrollmentForm" WHERE "studentId" = a_id;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHOU: comprovativo — A não vê a sua linha'; END IF;

  SELECT count(*) INTO n FROM public."StudentEnrollmentForm" WHERE "studentId" = b_id;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: comprovativo — A lê a linha de B'; END IF;

  -- Alterar e apagar a linha de B não apanha nenhuma linha
  UPDATE public."StudentEnrollmentForm" SET "taxId" = 'forjado' WHERE "studentId" = b_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: comprovativo — A altera a linha de B'; END IF;

  DELETE FROM public."StudentEnrollmentForm" WHERE "studentId" = b_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: comprovativo — A apaga a linha de B'; END IF;

  -- Nem a própria se apaga com a sessão
  DELETE FROM public."StudentEnrollmentForm" WHERE "studentId" = a_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: comprovativo — A apaga a sua linha'; END IF;

  -- Criar uma linha em nome de B é recusado pela política (42501), antes do UNIQUE
  BEGIN
    INSERT INTO public."StudentEnrollmentForm" ("studentId") VALUES (b_id);
    RAISE EXCEPTION 'FALHOU: comprovativo — A cria uma linha em nome de B';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Passar a sua linha para o nome de B é recusado pela política
  BEGIN
    UPDATE public."StudentEnrollmentForm" SET "studentId" = b_id WHERE "studentId" = a_id;
    RAISE EXCEPTION 'FALHOU: comprovativo — A passa a sua linha para B';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Submeter de novo (o que /adesao faz) continua a funcionar
  UPDATE public."StudentEnrollmentForm" SET "updatedAt" = now() WHERE "studentId" = a_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHOU: comprovativo — A não atualiza a sua linha'; END IF;

  -- ===== StudentInsuranceCoverage: fechada à sessão, mesmo na linha do próprio =====

  SELECT count(*) INTO n FROM public."StudentInsuranceCoverage";
  IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: seguro — A vê % linhas', n; END IF;

  UPDATE public."StudentInsuranceCoverage" SET "covered" = true WHERE "studentId" IN (a_id, b_id);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: seguro — A altera % linhas', n; END IF;

  DELETE FROM public."StudentInsuranceCoverage" WHERE "studentId" IN (a_id, b_id);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: seguro — A apaga % linhas', n; END IF;

  BEGIN
    INSERT INTO public."StudentInsuranceCoverage" ("studentId", "covered") VALUES (a_id, true);
    RAISE EXCEPTION 'FALHOU: seguro — A cria uma linha para si';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- ===== InsuranceSettings: o middleware continua a ler, ninguém escreve com a sessão =====

  SELECT count(*) INTO n FROM public."InsuranceSettings" WHERE "id" = 'global';
  IF n <> 1 THEN RAISE EXCEPTION 'FALHOU: valores — A não lê a linha global (o middleware precisa dela)'; END IF;

  UPDATE public."InsuranceSettings" SET "annualAmount" = 0;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: valores — A altera % linhas', n; END IF;

  DELETE FROM public."InsuranceSettings";
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: valores — A apaga % linhas', n; END IF;

  BEGIN
    INSERT INTO public."InsuranceSettings" ("id", "annualAmount") VALUES ('forjado', 0);
    RAISE EXCEPTION 'FALHOU: valores — A cria uma linha';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- O upsert é o que o admin faz em Configurações; com a sessão tem de ser recusado
  BEGIN
    INSERT INTO public."InsuranceSettings" ("id", "annualAmount") VALUES ('global', 0)
    ON CONFLICT ("id") DO UPDATE SET "annualAmount" = 0;
    RAISE EXCEPTION 'FALHOU: valores — A faz upsert da linha global';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Sem sessão não se vê nada
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('role', 'anon', true);

  BEGIN
    SELECT count(*) INTO n FROM public."StudentEnrollmentForm";
    IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: comprovativo — anónimo vê % linhas', n; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    SELECT count(*) INTO n FROM public."StudentInsuranceCoverage";
    IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: seguro — anónimo vê % linhas', n; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    SELECT count(*) INTO n FROM public."InsuranceSettings";
    IF n <> 0 THEN RAISE EXCEPTION 'FALHOU: valores — anónimo vê % linhas', n; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- O cliente admin (service role) continua a ver e a alterar tudo
  PERFORM set_config('role', 'service_role', true);

  SELECT count(*) INTO n FROM public."StudentEnrollmentForm" WHERE "studentId" = b_id;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHOU: comprovativo — o cliente admin não vê a linha de B'; END IF;

  UPDATE public."StudentInsuranceCoverage" SET "updatedAt" = now() WHERE "studentId" = b_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHOU: seguro — o cliente admin não altera a linha de B'; END IF;

  UPDATE public."InsuranceSettings" SET "updatedAt" = now() WHERE "id" = 'global';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHOU: valores — o cliente admin não altera a linha global'; END IF;
END
$test$;

ROLLBACK;
