import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Camera, Link2, MapPin, Briefcase, AtSign, User, Check } from 'lucide-react';
import { toast } from 'sonner';
import VerificationBadge, { BADGE_COLORS, BADGE_TYPES } from '@/components/VerificationBadge';

export default function EditProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    first_name: '', username: '', full_name: '', bio: '', website: '',
    location: '', category: '', avatar_url: '', verified: false, badge_type: null as string | null,
  });

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles')
      .select('first_name, username, full_name, bio, website, location, category, avatar_url, verified, badge_type')
      .eq('id', user.id).single();
    if (data) setForm({
      first_name: data.first_name || '', username: data.username || '', full_name: data.full_name || '',
      bio: data.bio || '', website: data.website || '', location: data.location || '',
      category: data.category || '', avatar_url: data.avatar_url || '',
      verified: !!data.verified, badge_type: data.badge_type,
    });
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setForm(p => ({ ...p, avatar_url: publicUrl }));
      toast.success('Foto atualizada');
    } catch { toast.error('Erro ao enviar foto'); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const uname = form.username.toLowerCase().replace(/\s+/g, '');
      const { data: taken } = await supabase.from('profiles').select('id')
        .eq('username', uname).neq('id', user.id).maybeSingle();
      if (taken) { toast.error('Este nome de usuário já está em uso'); setLoading(false); return; }

      const { error } = await supabase.from('profiles').update({
        first_name: form.first_name,
        username: uname,
        full_name: form.full_name || form.first_name,
        bio: form.bio,
        website: form.website,
        location: form.location,
        category: form.category,
        ...(form.verified ? { badge_type: form.badge_type || 'blue' } : {}),
      }).eq('id', user.id);
      if (error) throw error;
      toast.success('Perfil atualizado!');
      navigate('/profile');
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const Field = ({ icon: Icon, label, children }: any) => (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-border/40 last:border-b-0">
      <Icon className="h-5 w-5 text-muted-foreground mt-2.5 shrink-0" strokeWidth={1.8} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-muted-foreground mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <header className="flex items-center gap-2 h-14 px-2 border-b border-border/60 safe-area-top shrink-0">
        <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full flex items-center justify-center active:scale-90 transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-bold flex-1">Editar perfil</h1>
        <button onClick={handleSubmit} disabled={loading}
          className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold flex items-center gap-1.5 active:scale-95 transition disabled:opacity-50">
          <Check className="h-4 w-4" strokeWidth={2.6} /> {loading ? '...' : 'Guardar'}
        </button>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-10">
        <div className="max-w-lg mx-auto">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 py-7 border-b border-border/40">
            <button type="button" onClick={() => avatarInput.current?.click()} className="relative active:scale-95 transition">
              <Avatar className="h-24 w-24">
                <AvatarImage src={form.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="text-3xl font-bold bg-muted">{form.first_name[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-[3px] border-background">
                <Camera className="h-4 w-4" />
              </span>
            </button>
            <input ref={avatarInput} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-bold">{form.full_name || form.first_name}</span>
              {form.verified && <VerificationBadge verified badgeType={form.badge_type} size="sm" clickable={false} />}
            </div>
            <button type="button" onClick={() => avatarInput.current?.click()}
              className="text-[14px] font-semibold text-primary">
              {uploading ? 'A enviar...' : 'Alterar foto'}
            </button>
          </div>

          {form.verified && (
            <div className="px-4 py-4 border-b border-border/40">
              <p className="text-[12px] font-semibold text-muted-foreground mb-2.5">Selo personalizado</p>
              <div className="flex gap-2">
                {BADGE_TYPES.map((t) => {
                  const active = (form.badge_type || 'blue') === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, badge_type: t }))}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition active:scale-[0.97] ${
                        active ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/20'
                      }`}
                    >
                      <VerificationBadge verified badgeType={t} size="lg" clickable={false} />
                      <span className="text-[12px] font-semibold">{BADGE_COLORS[t].label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-2">O selo aparece ao lado do teu nome em todo o Blynk.</p>
            </div>
          )}

          <Field icon={User} label="Nome">
            <Input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
              required className="border-0 px-0 h-8 text-base focus-visible:ring-0 bg-transparent" placeholder="Seu nome" />
          </Field>
          <Field icon={AtSign} label="Nome de usuário">
            <Input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
              required className="border-0 px-0 h-8 text-base focus-visible:ring-0 bg-transparent" placeholder="username" />
          </Field>
          <Field icon={User} label="Nome de exibição">
            <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              className="border-0 px-0 h-8 text-base focus-visible:ring-0 bg-transparent" placeholder="Nome público" />
          </Field>
          <Field icon={Briefcase} label="Categoria">
            <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="border-0 px-0 h-8 text-base focus-visible:ring-0 bg-transparent" placeholder="Ex: Criador digital" />
          </Field>
          <Field icon={MapPin} label="Localização">
            <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              className="border-0 px-0 h-8 text-base focus-visible:ring-0 bg-transparent" placeholder="Luanda, Angola" />
          </Field>
          <Field icon={Link2} label="Link">
            <Input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
              inputMode="url" className="border-0 px-0 h-8 text-base focus-visible:ring-0 bg-transparent" placeholder="https://..." />
          </Field>

          <div className="px-4 py-4">
            <p className="text-[12px] font-semibold text-muted-foreground mb-1.5">Bio</p>
            <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              maxLength={160} rows={4}
              className="rounded-2xl text-base resize-none bg-muted/30 border-border/40" placeholder="Fale sobre você..." />
            <p className="text-[11px] text-muted-foreground/60 text-right mt-1">{form.bio.length}/160</p>
          </div>

          <div className="px-4">
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-full text-[15px] font-semibold">
              {loading ? 'A guardar...' : 'Guardar alterações'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
