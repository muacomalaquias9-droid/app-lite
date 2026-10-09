import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BKg4eumPGlDs_QHvFAICjFQmLU6iwILZYRyOFfzhvtO_itRkghY6lyFf9HBczAAPj0VGriju-Soa0L9AEsvC-8Q';

const toUint8 = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export type PushStatus = 'registered' | 'unsupported' | 'denied' | 'open-in-new-tab' | 'error';

/** Call from a button click. Subscribes this device to phone notifications. */
export async function enablePhonePush(userId: string, ask = true): Promise<PushStatus> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
    if (window.top !== window.self) return 'open-in-new-tab';
    let perm = Notification.permission;
    if (perm === 'default' && ask) perm = await Notification.requestPermission();
    if (perm !== 'granted') return 'denied';
    const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(VAPID_PUBLIC_KEY) });
    const j = sub.toJSON() as any;
    const row = { user_id: userId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth };
    const { error } = await supabase.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
    if (error) {
      // Endpoint may belong to a previous account on this phone: get a fresh one
      await sub.unsubscribe();
      const fresh = (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(VAPID_PUBLIC_KEY) })).toJSON() as any;
      const { error: e2 } = await supabase.from('push_subscriptions').insert({ user_id: userId, endpoint: fresh.endpoint, p256dh: fresh.keys.p256dh, auth: fresh.keys.auth });
      if (e2) throw e2;
    }
    return 'registered';
  } catch (e) {
    console.error('push subscribe failed', e);
    return 'error';
  }
}
