import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Search, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  created_by: string;
}

interface Friend {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
}

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadGroups();
      loadFriends();
      const cleanup = subscribeToGroups();
      return cleanup;
    }
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('group_members')
      .select('group_id, groups(*)')
      .eq('user_id', user.id);

    if (data) {
      const groupsList = data.map(item => item.groups).filter(Boolean);
      setGroups(groupsList as Group[]);
    }
  };

  const loadFriends = async () => {
    if (!user) return;

    const [{ data: followers }, { data: following }] = await Promise.all([
      supabase.from('follows').select('follower_id').eq('following_id', user.id),
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
    ]);
    const ids = [...new Set([
      ...(followers || []).map(f => f.follower_id),
      ...(following || []).map(f => f.following_id),
    ])].filter(id => id !== user.id);
    if (!ids.length) { setFriends([]); return; }
    const { data: profiles } = await supabase.from('profiles')
      .select('id, username, first_name, avatar_url').in('id', ids).order('first_name');
    setFriends(profiles || []);
  };

  const subscribeToGroups = () => {
    const channel = supabase
      .channel('groups-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups',
        },
        () => {
          loadGroups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedFriends.length === 0 || !user) {
      toast({
        title: 'Preencha todos os campos',
        description: 'Insira um nome e selecione pelo menos uma pessoa',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) {
        console.error('Group creation error:', groupError);
        throw groupError;
      }

      if (!group) {
        throw new Error('Grupo não foi criado');
      }

      // Add creator as member
      const members = [
        { group_id: group.id, user_id: user.id, is_admin: true },
        ...selectedFriends.map(friendId => ({
          group_id: group.id,
          user_id: friendId,
          is_admin: false,
        })),
      ];

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(members);

      if (membersError) {
        console.error('Members insertion error:', membersError);
        throw membersError;
      }

      toast({
        title: 'Grupo criado com sucesso!',
      });

      setGroupName('');
      setSelectedFriends([]);
      setIsDialogOpen(false);
      await loadGroups();
      navigate(`/group/${group.id}`);
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast({
        title: 'Erro ao criar grupo',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <MainLayout title="Grupos">
      <div className="flex flex-col h-full relative bg-background">
        <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate('/messages')}><ArrowLeft /></Button><h1 className="text-xl font-semibold">Grupos</h1></div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                 <Button size="icon" className="rounded-full" aria-label="Criar grupo">
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Grupo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Nome do grupo"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Seguidores e pessoas que filhas</p>
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Pesquisar pessoas" className="pl-9" /></div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {friends.filter(friend => `${friend.first_name} ${friend.username}`.toLowerCase().includes(memberSearch.toLowerCase())).map((friend) => (
                        <label key={friend.id} className="flex items-center gap-3 py-1 cursor-pointer">
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
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback>{friend.first_name?.[0] || friend.username?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{friend.first_name || friend.username}</span>
                        </label>
                      ))}
                      {friends.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Ainda não tens seguidores nem pessoas que filhas.</p>}
                    </div>
                  </div>
                  <Button
                    onClick={createGroup}
                    className="w-full"
                    disabled={creating || !groupName.trim() || selectedFriends.length === 0}
                  >
                     {creating ? 'A criar…' : 'Criar grupo'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {groups.map((group) => (
            <Button variant="ghost"
              key={group.id}
              onClick={() => navigate(`/group/${group.id}`)}
              className="w-full h-auto flex items-center justify-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={group.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Users className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-semibold">{group.name}</p>
              </div>
            </Button>
          ))}
        </div>

      </div>
    </MainLayout>
  );
}
