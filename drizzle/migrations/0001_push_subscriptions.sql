CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs" ON public.push_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.trigger_send_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://ytzjoetwuqnlyltgblfc.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0empvZXR3dXFubHlsdGdibGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0OTI4NzgsImV4cCI6MjA3OTA2ODg3OH0.lLg4cTJ96Nk_EqCzPJfFKmdBcxvKT637eHMJkgQwQcE"}'::jsonb,
    body := jsonb_build_object('table', TG_TABLE_NAME, 'id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.trigger_send_push() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS push_on_notification ON public.notifications;
CREATE TRIGGER push_on_notification AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();
DROP TRIGGER IF EXISTS push_on_message ON public.messages;
CREATE TRIGGER push_on_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();
DROP TRIGGER IF EXISTS push_on_group_message ON public.group_messages;
CREATE TRIGGER push_on_group_message AFTER INSERT ON public.group_messages FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();