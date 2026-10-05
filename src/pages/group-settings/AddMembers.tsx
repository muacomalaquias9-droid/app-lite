import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

interface Friend {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
}

export default function AddMembers() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [existingMembers, setExistingMembers] = useState<string[]>([]);

  useEffect(() => {
    if (user && groupId) {
      loadFriends();
      loadExistingMembers();
    }
  }, [user, groupId]);

  const loadFriends = async () => {
    if (!user) return;

    const [{ data: followers }, { data: following }] = await Promise.all([
      supabase.from('follows').select('follower_id').eq('following_id', user.id),
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
    ]);
    const ids = [...new Set([
      ...(followers || []).map(item => item.follower_id),
      ...(following || []).map(item => item.following_id),
    ])].filter(id => id !== user.id);
    if (ids.length === 0) { setFriends([]); return; }
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, first_name, avatar_url')
      .in('id', ids)
      .order('first_name');
    setFriends(profiles || []);
  };

  const loadExistingMembers = async () => {
    if (!groupId) return;

    const { data } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (data) {
      setExistingMembers(data.map(m => m.user_id));
    }
  };

  const addMembers = async () => {
    if (selectedFriends.length === 0 || !groupId) {
      toast({
        title: 'Selecione membros',
        description: 'Selecione pelo menos um amigo para adicionar',
        variant: 'destructive',
      });
      return;
    }

    const members = selectedFriends.map(friendId => ({
      group_id: groupId,
      user_id: friendId,
    }));

    const { error } = await supabase
      .from('group_members')
      .insert(members);

    if (error) {
      toast({
        title: 'Erro ao adicionar membros',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Membros adicionados com sucesso!',
      });
      navigate(`/group/${groupId}/settings`);
    }
  };

  const availableFriends = friends.filter(
    friend => !existingMembers.includes(friend.id)
  );

  return (
    <MainLayout title="Adicionar Membros">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {availableFriends.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Todos os teus seguidores e pessoas que filhas já estão no grupo
              </p>
            ) : (
              availableFriends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Checkbox
                    checked={selectedFriends.includes(friend.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedFriends([...selectedFriends, friend.id]);
                      } else {
                        setSelectedFriends(selectedFriends.filter(id => id !== friend.id));
                      }
                    }}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback>{friend.first_name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{friend.first_name}</p>
                    <p className="text-sm text-muted-foreground">@{friend.username}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {availableFriends.length > 0 && (
          <div className="p-4 border-t">
            <Button
              onClick={addMembers}
              className="w-full"
              disabled={selectedFriends.length === 0}
            >
              Adicionar {selectedFriends.length > 0 && `(${selectedFriends.length})`}
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
