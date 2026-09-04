CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

GRANT SELECT, INSERT ON public.post_views TO authenticated;
GRANT SELECT ON public.post_views TO anon;
GRANT ALL ON public.post_views TO service_role;

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can see post views" ON public.post_views;
CREATE POLICY "Anyone can see post views" ON public.post_views FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users register their own views" ON public.post_views;
CREATE POLICY "Users register their own views" ON public.post_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS post_views_post_id_idx ON public.post_views(post_id);