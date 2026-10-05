import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { 
  Users, Edit, LogOut, AlertTriangle, ChevronRight, 
  UserPlus, BellOff, Image as ImageIcon, MessageSquare 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: string;
}

export default function GroupSettings() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (groupId) {
      loadGroup();
      loadMuteSettings();
    }
  }, [groupId]);

  const loadGroup = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    
    if (data) setGroup(data);
  };

  const loadMuteSettings = async () => {
    if (!user || !groupId) return;
    
    const { data } = await supabase
      .from('group_members')
      .select('is_muted')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();
    
    if (data) setIsMuted(data.is_muted || false);
  };

  const toggleMute = async () => {
    if (!user || !groupId) return;
    
    const newMutedState = !isMuted;
    const { error } = await supabase
      .from('group_members')
      .update({ is_muted: newMutedState })
      .eq('group_id', groupId)
      .eq('user_id', user.id);
    
    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível alterar as notificações',
        variant: 'destructive',
      });
    } else {
      setIsMuted(newMutedState);
      toast({
        title: newMutedState ? 'Grupo silenciado' : 'Grupo reativado',
      });
    }
  };

  const leaveGroup = async () => {
    if (!user || !groupId) return;

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Erro ao sair do grupo',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Você saiu do grupo' });
      navigate('/groups');
    }
  };

  return (
    <MainLayout title="Configurações do Grupo">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={group?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Users className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold">{group?.name}</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate(`/group/${groupId}/add-members`)}
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  <span>Adicionar membros</span>
                </div>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <BellOff className="h-5 w-5" />
                  <span>Silenciar notificações</span>
                </div>
                <Switch checked={isMuted} onCheckedChange={toggleMute} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground px-2">Ações</h3>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate(`/group/${groupId}/members`)}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>Ver membros</span>
                </div>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground px-2">Personalização</h3>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate(`/group/${groupId}/edit-name`)}
              >
                <div className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  <span>Alterar nome do grupo</span>
                </div>
                <ChevronRight className="h-5 w-5" />
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate(`/group/${groupId}/edit-photo`)}
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  <span>Alterar foto do grupo</span>
                </div>
                <ChevronRight className="h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate(`/group/${groupId}/nicknames`)}
              >
                <div className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  <span>Alcunhas</span>
                </div>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground px-2">Privacidade e suporte</h3>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate(`/group/${groupId}/permissions`)}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Permissões de mensagens</span>
                </div>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={leaveGroup}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sair do grupo
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => navigate(`/denunciar/grupo/${groupId}`)}
              >
                <AlertTriangle className="h-5 w-5 mr-2" />
                Denunciar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
