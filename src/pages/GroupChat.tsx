import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Users, Phone, MoreVertical, Image as ImageIcon, Mic, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import MessageBubble from '@/components/chat/MessageBubble';
import MediaPicker from '@/components/chat/MediaPicker';
import WallpaperPicker from '@/components/chat/WallpaperPicker';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type?: string;
  media_url?: string;
  duration?: number;
  read_by?: string[] | null;
  profiles: {
    first_name: string;
    avatar_url: string | null;
  };
}

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface MemberProfile {
  id: string;
  first_name: string;
  avatar_url: string | null;
}

export default function GroupChat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [wallpaper, setWallpaper] = useState<string>('');
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) return;

    loadGroup();
    loadMembers();
    loadMessages();
    const cleanup = subscribeToMessages();

    return () => {
      cleanup && cleanup();
    };
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadGroup = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    
    if (data) setGroup(data);
  };

  const loadMembers = async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from('group_members')
      .select('user_id, profiles(id, first_name, avatar_url)')
      .eq('group_id', groupId);
    const profiles = (data || []).map((row: any) => row.profiles).filter(Boolean) as MemberProfile[];
    setMembers(profiles);
  };

  const loadMessages = async () => {
    if (!groupId) return;

    const { data } = await supabase
      .from('group_messages')
      .select('*, profiles(first_name, avatar_url)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as Message[]);
      const unreadIds = data.filter((message: any) => message.sender_id !== user?.id && !(message.read_by || []).includes(user?.id)).map((message: any) => message.id);
      if (unreadIds.length && user) {
        await Promise.all(unreadIds.map((id: string) => supabase.rpc('mark_group_message_read', { _message_id: id })));
      }
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('group-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            profiles: profile,
          } as Message;

          setMessages(prev => [...prev, newMsg]);
          if (user && newMsg.sender_id !== user.id) {
            await supabase.rpc('mark_group_message_read', { _message_id: newMsg.id });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !groupId) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: user.id,
      content: messageText,
      message_type: 'text',
    });

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleMediaSelect = async (url: string, type: 'image' | 'video' | 'audio', duration?: number) => {
    if (!user || !groupId) return;

    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: user.id,
      content: '',
      message_type: type,
      media_url: url,
      duration,
    });

    if (error) {
      console.error('Error sending media:', error);
    }
  };

  if (!group) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden" style={{ height: '100dvh' }}>
      <header className="flex-shrink-0 z-50 safe-area-top border-b border-border/50 bg-card/70 backdrop-blur-[50px] saturate-200 px-3 py-2">
        <div className="flex items-center justify-between gap-2 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/groups')}
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex -space-x-3 flex-shrink-0" onClick={() => navigate(`/group/${groupId}/settings`)}>
              {members.slice(0, 4).map((member, index) => (
                <Avatar key={member.id} className="h-9 w-9 border-2 border-card shadow-sm" style={{ zIndex: 4 - index }}>
                  <AvatarImage src={member.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="text-xs bg-muted">{member.first_name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
              {members.length === 0 && <Avatar className="h-9 w-9"><AvatarFallback><Users className="h-4 w-4" /></AvatarFallback></Avatar>}
            </div>
            
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => navigate(`/group/${groupId}/settings`)}
            >
              <p className="font-bold text-[13px] text-foreground truncate uppercase">{group.name}</p>
              <p className="text-[10px] text-muted-foreground">{members.length} pessoas no grupo</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => setShowWallpaperPicker(true)}>
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full h-9 w-9"
              onClick={() => navigate(`/group/${groupId}/settings`)}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-shrink-0 flex justify-center py-2 bg-muted/35 border-b border-border/30">
        <span className="rounded-full bg-success/10 text-success px-4 py-1.5 text-xs font-semibold">Conversa do grupo ativa</span>
      </div>

      <div 
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 relative native-scroll overscroll-contain"
        style={wallpaper ? {
          backgroundImage: `url(${wallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        } : undefined}
      >
        {wallpaper && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
        )}
        <div className="relative z-10 space-y-3 max-w-3xl mx-auto">
        {messages.map((message) => {
          const isSent = message.sender_id === user?.id;
          return (
            <div key={message.id} className="flex items-end gap-2">
              {!isSent && (
                <div className="mb-1 flex-shrink-0">
                  <Avatar className="h-7 w-7 border-2 border-background shadow-sm">
                    <AvatarImage src={message.profiles.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {message.profiles.first_name[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              <div className={`flex-1 flex flex-col ${isSent ? 'items-end' : 'items-start'}`}>
                {!isSent && <span className="text-[10px] text-muted-foreground ml-2 mb-0.5">{message.profiles.first_name}</span>}
                <MessageBubble
                  message={message}
                  isSent={isSent}
                  isGroupMessage={true}
                  contextType="group"
                  contextId={groupId}
                  viewedBy={(message.read_by || []).filter(id => id !== message.sender_id).map(id => members.find(member => member.id === id)).filter(Boolean) as MemberProfile[]}
                />
              </div>
            </div>
          );
        })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <WallpaperPicker
        open={showWallpaperPicker}
        onClose={() => setShowWallpaperPicker(false)}
        chatPartnerId={groupId || ''}
        currentWallpaper={wallpaper}
        onWallpaperChange={setWallpaper}
      />

      <form
        onSubmit={sendMessage}
        className="flex-shrink-0 bg-card/75 backdrop-blur-[50px] saturate-200 border-t border-border/40 px-3 py-2 safe-area-bottom"
      >
        <div className="flex gap-2 items-center max-w-3xl mx-auto">
          <div className="rounded-full bg-muted/70"><MediaPicker onMediaSelect={handleMediaSelect} /></div>
          <div className="relative flex-1">
            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escrever mensagem..." className="h-11 rounded-full border-0 bg-muted/70 pl-4 pr-11" />
            <Paperclip className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-success pointer-events-none" />
          </div>
          <Button
            type="submit"
            size="icon"
            className="rounded-full h-11 w-11 flex-shrink-0 bg-success text-success-foreground hover:bg-success/90"
          >
            {newMessage.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
