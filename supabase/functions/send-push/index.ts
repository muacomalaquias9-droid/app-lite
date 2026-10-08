import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
webpush.setVapidDetails('mailto:isaacmuaco582@gmail.com', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

const mediaLabel = (t?: string | null, c?: string | null) =>
  t === 'audio' ? 'Mensagem de voz' : t === 'image' ? 'Foto' : t === 'video' ? 'Vídeo' : (c || 'Nova mensagem');

async function sendTo(userIds: string[], payload: Record<string, unknown>) {
  if (!userIds.length) return 0;
  const { data: subs } = await sb.from('push_subscriptions').select('*').in('user_id', userIds);
  let sent = 0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from('push_subscriptions').delete().eq('id', s.id);
      else console.error('push fail', e?.statusCode, e?.body);
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { table, id } = await req.json();
    if (typeof id !== 'string' || !['notifications', 'messages', 'group_messages'].includes(table)) {
      return new Response(JSON.stringify({ error: 'invalid' }), { status: 400, headers: corsHeaders });
    }
    // Re-read the real record so spoofed calls can't send arbitrary content
    const { data: rec } = await sb.from(table).select('*').eq('id', id).maybeSingle();
    if (!rec) return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });
    let sent = 0;

    if (table === 'notifications') {
      sent = await sendTo([rec.user_id], {
        title: rec.title || 'Paji', body: rec.message, icon: rec.avatar_url || '/logo-192.png',
        url: '/notifications', tag: `notif-${rec.id}`,
      });
    } else if (table === 'messages') {
      const { data: p } = await sb.from('profiles').select('first_name, avatar_url').eq('id', rec.sender_id).maybeSingle();
      sent = await sendTo([rec.receiver_id], {
        title: p?.first_name || 'Nova mensagem', body: mediaLabel(rec.message_type, rec.content),
        icon: p?.avatar_url || '/logo-192.png', url: `/chat/${rec.sender_id}`, tag: `chat-${rec.sender_id}`,
      });
    } else {
      const [{ data: p }, { data: g }, { data: members }] = await Promise.all([
        sb.from('profiles').select('first_name, avatar_url').eq('id', rec.sender_id).maybeSingle(),
        sb.from('groups').select('name').eq('id', rec.group_id).maybeSingle(),
        sb.from('group_members').select('user_id').eq('group_id', rec.group_id),
      ]);
      const ids = (members || []).map((m: any) => m.user_id).filter((u: string) => u !== rec.sender_id);
      sent = await sendTo(ids, {
        title: g?.name || 'Grupo', body: `${p?.first_name || 'Alguém'}: ${mediaLabel(rec.message_type, rec.content)}`,
        icon: p?.avatar_url || '/logo-192.png', url: `/group/${rec.group_id}`, tag: `group-${rec.group_id}`,
      });
    }
    return new Response(JSON.stringify({ sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
