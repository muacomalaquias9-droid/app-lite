
CREATE TABLE IF NOT EXISTS public.user_locations (
  user_id UUID PRIMARY KEY,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  sharing_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_locations TO authenticated;
GRANT ALL ON public.user_locations TO service_role;

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shared locations"
ON public.user_locations FOR SELECT
TO authenticated
USING (sharing_enabled = true OR user_id = auth.uid());

CREATE POLICY "Users can insert own location"
ON public.user_locations FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own location"
ON public.user_locations FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own location"
ON public.user_locations FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_locations_updated ON public.user_locations(updated_at DESC);

CREATE OR REPLACE FUNCTION public.update_user_locations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_user_locations_updated_at ON public.user_locations;
CREATE TRIGGER trg_user_locations_updated_at
BEFORE UPDATE ON public.user_locations
FOR EACH ROW EXECUTE FUNCTION public.update_user_locations_updated_at();
