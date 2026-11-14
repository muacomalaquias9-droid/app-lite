GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;
GRANT ALL ON public.live_streams TO service_role;
REVOKE ALL ON public.live_streams FROM anon;

DROP POLICY IF EXISTS "Users can view active streams" ON public.live_streams;
DROP POLICY IF EXISTS "Users can create their own streams" ON public.live_streams;
DROP POLICY IF EXISTS "Users can update their own streams" ON public.live_streams;
DROP POLICY IF EXISTS "Users can delete their own streams" ON public.live_streams;
CREATE POLICY "Authenticated users can view active streams" ON public.live_streams FOR SELECT TO authenticated USING (is_active = true OR auth.uid() = user_id);
CREATE POLICY "Authenticated users can start their own streams" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Hosts can manage their own streams" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Hosts can end their own streams" ON public.live_streams FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.live_room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_role text NOT NULL DEFAULT 'viewer' CHECK (room_role IN ('viewer', 'speaker', 'host', 'moderator')),
  state text NOT NULL DEFAULT 'joined' CHECK (state IN ('joined', 'waiting', 'stage', 'left', 'removed')),
  is_muted boolean NOT NULL DEFAULT false,
  force_muted boolean NOT NULL DEFAULT false,
  is_moderator boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  requested_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.live_room_participants TO authenticated;
GRANT ALL ON public.live_room_participants TO service_role;
ALTER TABLE public.live_room_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_live_room(_stream_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_streams s
    WHERE s.id = _stream_id AND s.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.live_room_participants p
    WHERE p.stream_id = _stream_id
      AND p.user_id = _user_id
      AND p.is_moderator = true
      AND p.is_banned = false
      AND p.state NOT IN ('left', 'removed')
  )
$$;
REVOKE ALL ON FUNCTION public.can_manage_live_room(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_live_room(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_live_room_participant_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  is_host boolean := false;
  is_moderator boolean := false;
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id <> actor THEN
      RAISE EXCEPTION 'Participants can only add themselves';
    END IF;
    IF EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = NEW.stream_id AND s.user_id = actor) THEN
      IF NEW.room_role <> 'host' OR NEW.state <> 'stage' OR NEW.is_banned OR NEW.is_moderator THEN
        RAISE EXCEPTION 'Invalid host membership';
      END IF;
    ELSIF NEW.room_role <> 'viewer' OR NEW.state <> 'joined' OR NEW.is_banned OR NEW.is_moderator OR NEW.force_muted THEN
      RAISE EXCEPTION 'New attendees must join as viewers';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.stream_id IS DISTINCT FROM OLD.stream_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Live-room membership identity cannot be changed';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = OLD.stream_id AND s.user_id = actor)
    INTO is_host;
  IF is_host THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.live_room_participants p
    WHERE p.stream_id = OLD.stream_id AND p.user_id = actor AND p.is_moderator = true
      AND p.is_banned = false AND p.state NOT IN ('left', 'removed')
  ) INTO is_moderator;

  IF is_moderator AND OLD.user_id <> actor THEN
    IF OLD.room_role = 'host'
      OR NEW.room_role IS DISTINCT FROM OLD.room_role
      OR NEW.is_moderator IS DISTINCT FROM OLD.is_moderator
      OR (NEW.is_banned = false AND OLD.is_banned = true)
      OR (NEW.force_muted = false AND OLD.force_muted = true)
      OR (NEW.state IS DISTINCT FROM OLD.state AND NEW.state <> 'removed') THEN
      RAISE EXCEPTION 'Moderators can only mute or remove attendees';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.user_id = actor THEN
    IF NEW.room_role IS DISTINCT FROM OLD.room_role
      OR NEW.is_moderator IS DISTINCT FROM OLD.is_moderator
      OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
      OR NEW.force_muted IS DISTINCT FROM OLD.force_muted
      OR (NEW.state IS DISTINCT FROM OLD.state AND NOT (OLD.state = 'left' AND NEW.state = 'joined' AND OLD.is_banned = false))
      OR (OLD.force_muted = true AND NEW.is_muted = false) THEN
      RAISE EXCEPTION 'Attendees cannot change their room privileges';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to manage this attendee';
END;
$$;
REVOKE ALL ON FUNCTION public.guard_live_room_participant_changes() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_live_room_participant_changes
BEFORE INSERT OR UPDATE ON public.live_room_participants
FOR EACH ROW EXECUTE FUNCTION public.guard_live_room_participant_changes();

DROP POLICY IF EXISTS "Live room members can view attendees" ON public.live_room_participants;
DROP POLICY IF EXISTS "Authenticated users can join a live room" ON public.live_room_participants;
DROP POLICY IF EXISTS "Attendees and moderators can update live room members" ON public.live_room_participants;
CREATE POLICY "Live room members can view attendees" ON public.live_room_participants
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_id AND s.is_active = true));
CREATE POLICY "Authenticated users can join a live room" ON public.live_room_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_id AND s.is_active = true)
    AND (
      (room_role = 'host' AND state = 'stage' AND EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_id AND s.user_id = auth.uid()))
      OR (room_role = 'viewer' AND state = 'joined' AND is_moderator = false AND is_banned = false)
    )
  );
CREATE POLICY "Attendees and moderators can update live room members" ON public.live_room_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.can_manage_live_room(stream_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.can_manage_live_room(stream_id, auth.uid()));
CREATE INDEX live_room_participants_stream_state_idx ON public.live_room_participants(stream_id, state);

CREATE TABLE public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.live_chat_messages TO authenticated;
GRANT ALL ON public.live_chat_messages TO service_role;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read live chat" ON public.live_chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_id));
CREATE POLICY "Current attendees can comment in live rooms" ON public.live_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.live_room_participants p
      JOIN public.live_streams s ON s.id = p.stream_id
      WHERE p.stream_id = live_chat_messages.stream_id AND p.user_id = auth.uid()
        AND p.state NOT IN ('left', 'removed') AND p.is_banned = false AND s.is_active = true
    )
  );
CREATE POLICY "Authors and room moderators can remove live comments" ON public.live_chat_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.can_manage_live_room(stream_id, auth.uid()));
CREATE INDEX live_chat_messages_stream_created_idx ON public.live_chat_messages(stream_id, created_at);

CREATE TABLE public.live_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice', 'refresh')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(payload::text) <= 131072),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> receiver_id)
);
GRANT SELECT, INSERT, DELETE ON public.live_signals TO authenticated;
GRANT ALL ON public.live_signals TO service_role;
ALTER TABLE public.live_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room peers can read their own live signals" ON public.live_signals
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Active room members can send live signals" ON public.live_signals
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.live_streams s
      JOIN public.live_room_participants sender ON sender.stream_id = s.id AND sender.user_id = sender_id
      JOIN public.live_room_participants receiver ON receiver.stream_id = s.id AND receiver.user_id = receiver_id
      WHERE s.id = live_signals.stream_id AND s.is_active = true
        AND sender.is_banned = false AND sender.state NOT IN ('left', 'removed')
        AND receiver.is_banned = false AND receiver.state NOT IN ('left', 'removed')
    )
  );
CREATE POLICY "Recipients can clear processed live signals" ON public.live_signals
  FOR DELETE TO authenticated USING (auth.uid() = receiver_id);
CREATE INDEX live_signals_recipient_created_idx ON public.live_signals(receiver_id, created_at);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_room_participants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_signals;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;