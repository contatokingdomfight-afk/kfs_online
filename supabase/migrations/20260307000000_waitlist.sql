-- Lista de espera para abertura da academia física (Oeiras/Cascais)
-- Usado por /lista_espera (Instagram Ads e outros)
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  marketing_optin boolean NOT NULL DEFAULT false,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (lower(email));
COMMENT ON TABLE waitlist IS 'Leads da landing /lista_espera (ex.: Instagram Ads).';
