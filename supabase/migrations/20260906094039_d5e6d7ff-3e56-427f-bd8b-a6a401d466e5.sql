CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  selfie_url text,
  document_url text,
  birth_date date,
  document_expiry date,
  document_number text,
  full_name_document text,
  face_match_score numeric,
  ai_verdict text,
  ai_reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.identity_verifications TO authenticated;
GRANT ALL ON public.identity_verifications TO service_role;

ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own identity verifications"
ON public.identity_verifications FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own identity verifications"
ON public.identity_verifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update identity verifications"
ON public.identity_verifications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_identity_verifications_user ON public.identity_verifications(user_id);

CREATE TRIGGER trg_identity_verifications_updated_at
BEFORE UPDATE ON public.identity_verifications
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.profiles ALTER COLUMN is_public SET DEFAULT true;
UPDATE public.profiles SET is_public = true WHERE is_public IS NULL;