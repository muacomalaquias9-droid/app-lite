CREATE OR REPLACE FUNCTION public.get_blocked_user_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT user_id FROM public.blocked_accounts $$;
REVOKE EXECUTE ON FUNCTION public.get_blocked_user_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_blocked_user_ids() TO authenticated, service_role;