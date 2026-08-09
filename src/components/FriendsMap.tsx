import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Friends map (Zenly-style) — shows authenticated users on a real Google Map
 * using GPS. Persists own location in `user_locations` and subscribes to others.
 */

const GMAPS_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

declare global {
  interface Window {
    __blynkInitMap?: () => void;
    google?: any;
  }
}

type LocRow = {
  user_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
  sharing_enabled: boolean;
  profile?: { username: string; first_name: string; avatar_url: string | null } | null;
};

let gmapsLoading: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.google?.maps) return Promise.resolve();
  if (gmapsLoading) return gmapsLoading;
  if (!GMAPS_KEY) return Promise.reject(new Error('Missing Google Maps browser key'));

  gmapsLoading = new Promise((resolve, reject) => {
    window.__blynkInitMap = () => resolve();
    const script = document.createElement('script');
    const channel = TRACKING_ID ? `&channel=${encodeURIComponent(TRACKING_ID)}` : '';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&loading=async&callback=__blynkInitMap${channel}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
  return gmapsLoading;
}

function buildAvatarIcon(avatarUrl: string | null | undefined, fallbackLetter: string): string {
  // SVG with circular foreignObject containing img — works as marker icon
  const letter = (fallbackLetter || 'U').toUpperCase().slice(0, 1);
  const safeUrl = avatarUrl
    ? avatarUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    : '';
  const inner = avatarUrl
    ? `<image href="${safeUrl}" x="6" y="6" width="56" height="56" clip-path="circle(28px at 28px 28px)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="6" y="6" width="56" height="56" rx="28" fill="#6b46ff"/><text x="34" y="44" text-anchor="middle" font-size="26" font-family="system-ui" font-weight="800" fill="white">${letter}</text>`;
  const svg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="68" height="84" viewBox="0 0 68 84"><defs><filter id="s" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.35"/></filter></defs><g filter="url(#s)"><path d="M34 80 L18 56 Q34 64 50 56 Z" fill="white"/><circle cx="34" cy="34" r="32" fill="white"/></g>${inner}</svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

export default function FriendsMap({ fullscreen = false }: { fullscreen?: boolean } = {}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const watchRef = useRef<number | null>(null);
  const lastUploadRef = useRef<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionPrompt, setPermissionPrompt] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);

  // Initialize map + load friend locations
  useEffect(() => {
    let cancelled = false;
    let channel: any = null;

    async function init() {
      try {
        await loadGoogleMaps();
        if (cancelled || !containerRef.current) return;

        const google = window.google;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat: -8.838, lng: 13.234 }, // Luanda default
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        });

        await loadLocations();

        channel = supabase
          .channel('user_locations_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, () => loadLocations())
          .subscribe();

        // Check permission state — if not granted, show explicit prompt instead of silently failing
        try {
          const perm: any = (navigator as any).permissions
            ? await (navigator as any).permissions.query({ name: 'geolocation' as PermissionName })
            : null;
          if (perm?.state === 'granted') {
            startWatching();
          } else if (perm?.state === 'denied') {
            setPermissionDenied(true);
          } else {
            setPermissionPrompt(true);
          }
        } catch {
          setPermissionPrompt(true);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erro ao carregar mapa');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
      if (watchRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
      if (channel) supabase.removeChannel(channel);
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLocations() {
    if (!mapRef.current || !window.google) return;
    const { data: locs } = await (supabase as any)
      .from('user_locations')
      .select('user_id, latitude, longitude, updated_at, sharing_enabled')
      .eq('sharing_enabled', true)
      .gt('updated_at', new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString())
      .limit(200);

    if (!locs || locs.length === 0) {
      setFriendsCount(0);
      return;
    }

    const ids = locs.map((l: LocRow) => l.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, first_name, avatar_url')
      .in('id', ids);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    setFriendsCount(locs.length);

    const seen = new Set<string>();
    const google = window.google;

    locs.forEach((loc: LocRow) => {
      seen.add(loc.user_id);
      const profile = profileMap.get(loc.user_id) as any;
      const icon = {
        url: buildAvatarIcon(profile?.avatar_url, profile?.first_name?.[0] || profile?.username?.[0] || '?'),
        scaledSize: new google.maps.Size(68, 84),
        anchor: new google.maps.Point(34, 80),
      };
      const existing = markersRef.current.get(loc.user_id);
      const position = { lat: loc.latitude, lng: loc.longitude };
      if (existing) {
        existing.setPosition(position);
        existing.setIcon(icon);
      } else {
        const marker = new google.maps.Marker({
          position,
          map: mapRef.current,
          icon,
          title: profile?.first_name || profile?.username || 'Usuário',
          optimized: false,
        });
        marker.addListener('click', () => navigate(`/profile/${loc.user_id}`));
        markersRef.current.set(loc.user_id, marker);
      }
    });

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });
  }

  function startWatching() {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste dispositivo');
      return;
    }
    setPermissionPrompt(false);
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        // Center map first time
        if (mapRef.current && lastUploadRef.current === 0) {
          mapRef.current.panTo({ lat: latitude, lng: longitude });
          mapRef.current.setZoom(15);
        }
        // Throttle upserts: max every 30s
        const now = Date.now();
        if (now - lastUploadRef.current < 30_000) return;
        lastUploadRef.current = now;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await (supabase as any).from('user_locations').upsert({
          user_id: user.id,
          latitude,
          longitude,
          accuracy,
          sharing_enabled: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermissionDenied(true);
        else setError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 }
    );
  }

  function requestPermission() {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste dispositivo');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => startWatching(),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setPermissionPrompt(false);
        } else {
          setError(err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  }

  async function disableSharing() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from('user_locations').update({ sharing_enabled: false }).eq('user_id', user.id);
    toast.success('Localização ocultada');
  }

  if (!GMAPS_KEY) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-6 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Mapa indisponível — configurar Google Maps.</p>
      </div>
    );
  }

  return (
    <div className={
      fullscreen
        ? "fixed inset-0 z-40 bg-background"
        : "relative h-[calc(100dvh-220px)] w-full rounded-3xl overflow-hidden bg-muted/30 border border-border/30 shadow-lg"
    }>
      <div ref={containerRef} className="absolute inset-0" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      )}

      {error && !permissionDenied && (
        <div className="absolute top-3 left-3 right-3 rounded-2xl bg-destructive/90 text-destructive-foreground p-3 text-xs font-semibold shadow-lg">
          {error}
        </div>
      )}

      {permissionDenied && (
        <div className="absolute top-3 left-3 right-3 rounded-2xl bg-card/95 backdrop-blur-xl border border-border p-3 shadow-lg">
          <p className="text-xs font-semibold mb-1">Localização bloqueada</p>
          <p className="text-[11px] text-muted-foreground">Activa a permissão de localização nas definições do navegador para apareceres no mapa.</p>
        </div>
      )}

      {permissionPrompt && !permissionDenied && (
        <div className="absolute top-3 left-3 right-3 rounded-2xl bg-card/95 backdrop-blur-xl border border-border p-4 shadow-xl flex flex-col gap-2">
          <p className="text-sm font-bold">Aparecer no mapa</p>
          <p className="text-xs text-muted-foreground">Permite a localização para veres os teus amigos e apareceres a eles em tempo real.</p>
          <Button onClick={requestPermission} className="h-9 rounded-full mt-1 text-xs font-bold">
            Activar localização
          </Button>
        </div>
      )}

      {/* Floating info pill */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-2 rounded-full bg-card/85 backdrop-blur-xl border border-border/40 shadow-lg pointer-events-none">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[12px] font-bold">{friendsCount} no mapa</span>
      </div>

      {/* Recenter button */}
      <Button
        size="icon"
        variant="secondary"
        onClick={() => {
          if (!navigator.geolocation || !mapRef.current) return;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              mapRef.current.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              mapRef.current.setZoom(16);
            },
            (err) => toast.error(err.message),
            { enableHighAccuracy: true }
          );
        }}
        className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-xl bg-card/95 backdrop-blur-xl"
      >
        <Navigation className="h-5 w-5" />
      </Button>

      <Button
        size="sm"
        variant="secondary"
        onClick={disableSharing}
        className="absolute bottom-4 left-4 h-10 rounded-full shadow-xl bg-card/95 backdrop-blur-xl text-[11px] font-bold px-3"
      >
        Ocultar-me
      </Button>
    </div>
  );
}