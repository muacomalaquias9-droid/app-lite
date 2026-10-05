GRANT SELECT, INSERT, UPDATE ON public.groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_messages TO authenticated;
GRANT ALL ON public.groups TO service_role;
GRANT ALL ON public.group_members TO service_role;
GRANT ALL ON public.group_messages TO service_role;

DROP POLICY IF EXISTS "Group creators can add members" ON public.group_members;
CREATE POLICY "Group admins can add members"
ON public.group_members FOR INSERT TO authenticated
WITH CHECK (public.is_group_admin(auth.uid(), group_id));

DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
CREATE POLICY "Members can leave and admins can remove"
ON public.group_members FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_group_admin(auth.uid(), group_id));

CREATE POLICY "Members can update their own preferences"
ON public.group_members FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_group_admin(auth.uid(), group_id))
WITH CHECK (auth.uid() = user_id OR public.is_group_admin(auth.uid(), group_id));

DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
CREATE POLICY "Allowed members can update group information"
ON public.groups FOR UPDATE TO authenticated
USING (
  public.is_group_admin(auth.uid(), id)
  OR (
    COALESCE(all_members_can_edit_info, false)
    AND public.is_group_member(auth.uid(), id)
  )
)
WITH CHECK (
  public.is_group_admin(auth.uid(), id)
  OR (
    COALESCE(all_members_can_edit_info, false)
    AND public.is_group_member(auth.uid(), id)
  )
);

CREATE POLICY "Group members can send messages"
ON public.group_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_group_member(auth.uid(), group_id)
  AND (
    public.is_group_admin(auth.uid(), group_id)
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_messages.group_id
        AND COALESCE(g.all_members_can_send, true)
    )
  )
);

CREATE OR REPLACE FUNCTION public.mark_group_message_read(_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _group_id uuid;
BEGIN
  SELECT group_id INTO _group_id
  FROM public.group_messages
  WHERE id = _message_id;

  IF _group_id IS NULL OR NOT public.is_group_member(auth.uid(), _group_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.group_messages
  SET read_by = array_append(COALESCE(read_by, ARRAY[]::uuid[]), auth.uid())
  WHERE id = _message_id
    AND sender_id <> auth.uid()
    AND NOT (auth.uid() = ANY(COALESCE(read_by, ARRAY[]::uuid[])));
END;
$$;

REVOKE ALL ON FUNCTION public.mark_group_message_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_group_message_read(uuid) TO authenticated, service_role;