import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function EditPhoto() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (groupId) {
      loadGroupPhoto();
    }
  }, [groupId]);

  const loadGroupPhoto = async () => {
    if (!groupId) return;

    const { data } = await supabase
      .from('groups')
      .select('avatar_url')
      .eq('id', groupId)
      .single();

    if (data) setAvatarUrl(data.avatar_url);
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !groupId) return;

    const file = e.target.files[0];
    
    // Validar tamanho do arquivo (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 5MB',
        variant: 'destructive',
      });
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `groups/${groupId}-${Date.now()}.${fileExt}`;
      
      // Deletar foto antiga se existir
      if (avatarUrl) {
        const oldFileName = avatarUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('avatars').remove([`groups/${oldFileName}`]);
        }
      }
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('groups')
        .update({ avatar_url: publicUrl })
        .eq('id', groupId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({
        title: 'Foto atualizada!',
      });
      
      setTimeout(() => {
        navigate(`/group/${groupId}/settings`);
      }, 500);
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <MainLayout title="Alterar Foto do Grupo">
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
          <Avatar className="h-32 w-32">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Users className="h-16 w-16" />
            </AvatarFallback>
          </Avatar>

          <input
            type="file"
            id="photo-upload"
            className="hidden"
            accept="image/*"
            onChange={uploadPhoto}
            disabled={uploading}
          />

          <Button
            onClick={() => document.getElementById('photo-upload')?.click()}
            disabled={uploading}
            size="lg"
          >
            <Upload className="h-5 w-5 mr-2" />
            {uploading ? 'Enviando...' : 'Escolher Foto'}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Selecione uma imagem que represente o grupo
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
