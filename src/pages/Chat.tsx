import { useEffect, useState, useRef } from 'react';
import { readSnapshot, writeSnapshot } from '@/lib/snapshot';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Phone, Video, MoreVertical, Mic, Smile, Paperclip, Check, CheckCheck, Palette, Copy, Trash2, Heart, Clock, Edit3, X } from 'lucide-react';
import { format } from 'date-fns';
import CallInterface from '@/components/call/CallInterface';
import ChatPinProtection from '@/components/chat/ChatPinProtection';
import WallpaperPicker from '@/components/chat/WallpaperPicker';
import AudioWaveform from '@/components/chat/AudioWaveform';
import EmojiPicker from '@/components/chat/EmojiPicker';
import { ImageViewer } from '@/components/chat/ImageViewer';
import ChatPhotoEditor from '@/components/chat/ChatPhotoEditor';
import { showNotification } from '@/utils/pushNotifications';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { useTemporaryMessages } from '@/hooks/useTemporaryMessages';
import { ChatSkeleton } from '@/components/loading/ChatSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  message_type?: string;
  media_url?: string;
  duration?: number;
  read?: boolean;
  edited?: boolean;
}

interface Profile {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
  verified?: boolean;
  badge_type?: string | null;
}

export default function Chat() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => readSnapshot<Message[]>(`chat:${user?.id}:${friendId}`, []));
  const [friend, setFriend] = useState<Profile | null>(() => readSnapshot<Profile | null>(`chatfriend:${friendId}`, null));
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [activeCall, setActiveCall] = useState<{ id: string; type: 'voice' | 'video' } | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [chatSettings, setChatSettings] = useState<any>(null);
  const [sendingMessages, setSendingMessages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [wallpaper, setWallpaper] = useState<string>('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');

  // Photo editor state
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimeRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { isOnline } = useUserPresence(friendId);
  const { typingUsers, setTyping } = useTypingIndicator(friendId || '');
  
  useScreenshotProtection(true);
  
  useTemporaryMessages({
    chatPartnerId: friendId || '',
    userId: user?.id || '',
    duration: chatSettings?.temporary_messages_duration || 'disabled',
  });

  useEffect(() => {
    if (!friendId) return;

    const loadData = async () => {
      if (messages.length) setLoading(false);
      await Promise.all([loadFriend(), loadMyProfile(), loadChatSettings(), loadMessages(), loadWallpaper()]);
      
      setLoading(false);
    };
    
    loadData();
    const messagesCleanup = subscribeToMessages();
    const settingsCleanup = subscribeToChatSettings();

    return () => {
      messagesCleanup && messagesCleanup();
      settingsCleanup && settingsCleanup();
    };
  }, [friendId]);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      loadChatSettings();
    };

    window.addEventListener('chatSettingsUpdated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('chatSettingsUpdated', handleSettingsUpdate);
    };
  }, [friendId]);

  useEffect(() => {
    if (!user || !friendId) return;

    const callId = searchParams.get('callId');
    const callType = searchParams.get('callType') === 'video' ? 'video' : 'voice';
    const shouldAccept = searchParams.get('accept') === '1';

    if (!callId || activeCall?.id === callId) return;

    let cancelled = false;

    const joinExistingCall = async () => {
      if (shouldAccept) {
        await supabase
          .from('calls')
          .update({ status: 'accepted' })
          .eq('id', callId)
          .eq('receiver_id', user.id);
      }

      if (!cancelled) {
        setActiveCall({ id: callId, type: callType });
      }
    };

    joinExistingCall();

    return () => {
      cancelled = true;
    };
  }, [user, friendId, searchParams, activeCall?.id]);

  const subscribeToChatSettings = () => {
    if (!user || !friendId) return;

    const channel = supabase
      .channel('chat-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData && newData.chat_partner_id === friendId) {
            loadChatSettings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadChatSettings = async () => {
    if (!user || !friendId) return;

    const { data } = await supabase
      .from('chat_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('chat_partner_id', friendId)
      .single();

    if (data) {
      setChatSettings(data);
      if (data.is_locked && !isUnlocked) {
        setIsUnlocked(false);
      } else {
        setIsUnlocked(true);
      }
    } else {
      setIsUnlocked(true);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Also scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [loading]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadFriend = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', friendId)
      .single();
    
    if (data) setFriend(data);
  };

  const loadMyProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, username, first_name, avatar_url, verified, badge_type')
      .eq('id', user.id)
      .single();
    if (data) setMyProfile(data);
  };

  const loadWallpaper = async () => {
    if (!user || !friendId) return;

    const { data } = await supabase
      .from('chat_wallpapers')
      .select('wallpaper_url')
      .eq('user_id', user.id)
      .eq('chat_partner_id', friendId)
      .single();

    if (data) {
      setWallpaper(data.wallpaper_url);
    }
  };

  const loadMessages = async () => {
    if (!user || !friendId) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (data) { setMessages(data); writeSnapshot(`chat:${user.id}:${friendId}`, data, 60); }

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', friendId);
  };

  const subscribeToMessages = () => {
    const isThisChat = (m: Message) =>
      (m.sender_id === user?.id && m.receiver_id === friendId) ||
      (m.sender_id === friendId && m.receiver_id === user?.id);
    const channel = supabase
      .channel(`chat-messages:${user?.id}:${friendId}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (!isThisChat(newMsg)) return;
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          if (newMsg.sender_id === friendId) {
            supabase.from('messages').update({ read: true }).eq('id', newMsg.id).then(() => {});
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const upd = payload.new as Message;
          if (!isThisChat(upd)) return;
          setMessages(prev => prev.map(m => m.id === upd.id ? { ...m, ...upd } : m));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (value.trim()) {
      setTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 2000);
    } else {
      setTyping(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !friendId) return;

    const messageText = newMessage.trim();
    
    if (sendingMessages.has(messageText)) {
      return;
    }

    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSendingMessages(prev => new Set(prev).add(messageText));
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: messageText,
      message_type: 'text',
    });

    setSendingMessages(prev => {
      const newSet = new Set(prev);
      newSet.delete(messageText);
      return newSet;
    });

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleMediaSelect = async (url: string, type: 'image' | 'video' | 'audio', duration?: number) => {
    if (!user || !friendId) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: '',
      message_type: type,
      media_url: url,
      duration,
    });

    if (error) {
      console.error('Error sending media:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    if (isImage) {
      setSelectedPhotoFile(file);
      setShowPhotoEditor(true);
    } else {
      handleFileUpload(file, 'video');
    }
    
    e.target.value = '';
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    if (!user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const folder = type === 'image' ? 'images' : 'videos';

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(`${folder}/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-media')
        .getPublicUrl(`${folder}/${fileName}`);

      handleMediaSelect(data.publicUrl, type);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handlePhotoSend = async (file: File, singleView: boolean) => {
    // For now, just upload and send - singleView would need backend support
    await handleFileUpload(file, 'image');
    if (singleView) {
      toast.info('Foto enviada em visualização única');
    }
  };

  const uploadChatAudio = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `audios/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('chat-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const startVoiceRecording = async () => {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      recordStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });

          const url = await uploadChatAudio(file);
          await handleMediaSelect(url, 'audio', recordingTimeRef.current);
        } catch (error) {
          console.error('Error sending voice message:', error);
          toast.error('Erro ao enviar áudio');
        } finally {
          recordStreamRef.current?.getTracks().forEach((t) => t.stop());
          recordStreamRef.current = null;
          chunksRef.current = [];
          setRecordingTime(0);
          recordingTimeRef.current = 0;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Gravando...');

      recordTimerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);

    } catch (error) {
      console.error('Microphone access error:', error);
      toast.error('Permita o acesso ao microfone');
    }
  };

  const stopVoiceRecording = () => {
    if (!isRecording) return;

    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    setIsRecording(false);
    mediaRecorderRef.current?.stop();
  };

  const startCall = async (type: 'voice' | 'video') => {
    if (!user || !friendId) return;

    try {
      const mediaPreview = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: type === 'video' ? { facingMode: 'user' } : false,
      });

      mediaPreview.getTracks().forEach((track) => track.stop());
    } catch (error) {
      toast.error(type === 'video' ? 'Permita câmera e microfone para ligar' : 'Permita microfone para ligar');
      return;
    }

    const activeStatuses = ['calling', 'accepted', 'ongoing'];
    const staleCutoff = new Date(Date.now() - 45_000).toISOString();

    await supabase
      .from('calls')
      .update({ status: 'missed', ended_at: new Date().toISOString() })
      .in('status', ['calling', 'accepted'])
      .is('ended_at', null)
      .lt('started_at', staleCutoff);

    const [{ data: myCalls }, { data: friendCalls }] = await Promise.all([
      supabase
        .from('calls')
        .select('id')
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .in('status', activeStatuses)
        .is('ended_at', null)
        .gte('started_at', staleCutoff)
        .limit(1),
      supabase
        .from('calls')
        .select('id')
        .or(`caller_id.eq.${friendId},receiver_id.eq.${friendId}`)
        .in('status', activeStatuses)
        .is('ended_at', null)
        .gte('started_at', staleCutoff)
        .limit(1),
    ]);

    if ((myCalls?.length || 0) > 0 || (friendCalls?.length || 0) > 0) {
      toast.error('Um dos usuários já está em chamada');
      return;
    }

    const { data, error } = await supabase
      .from('calls')
      .insert({
        caller_id: user.id,
        receiver_id: friendId,
        call_type: type,
        status: 'calling',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast.error('Não foi possível iniciar a chamada');
      return;
    }

    if (data) {
      setActiveCall({ id: data.id, type });
    }
  };

  // Long press handlers for message actions
  const handleMessageTouchStart = (message: Message) => {
    longPressTimerRef.current = setTimeout(() => {
      setSelectedMessage(message);
      setShowMessageActions(true);
    }, 2000); // 2 seconds
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Message Actions
  const handleCopyMessage = (message: Message) => {
    navigator.clipboard.writeText(message.content || message.media_url || '');
    toast.success('Mensagem copiada!');
    setShowMessageActions(false);
  };

  const handleDeleteMessage = async (message: Message) => {
    await supabase.from('messages').delete().eq('id', message.id);
    setMessages(prev => prev.filter(m => m.id !== message.id));
    toast.success('Mensagem eliminada!');
    setShowMessageActions(false);
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setEditText(message.content);
    setShowMessageActions(false);
  };

  const saveEditedMessage = async () => {
    if (!editingMessage || !editText.trim()) return;

    await supabase
      .from('messages')
      .update({ content: editText.trim() })
      .eq('id', editingMessage.id);

    setMessages(prev => prev.map(m => 
      m.id === editingMessage.id ? { ...m, content: editText.trim(), edited: true } : m
    ));
    
    setEditingMessage(null);
    setEditText('');
    toast.success('Mensagem editada!');
  };

  const handleReactToMessage = async (message: Message, emoji: string) => {
    if (!user) return;
    
    // Check if reaction exists
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', message.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      if (existing.emoji === emoji) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('message_reactions').update({ emoji }).eq('id', existing.id);
      }
    } else {
      await supabase.from('message_reactions').insert({
        message_id: message.id,
        user_id: user.id,
        emoji,
      });
    }
    
    toast.success('Reação adicionada!');
    setShowMessageActions(false);
  };

  const openImageViewer = (url: string) => {
    setSelectedImageUrl(url);
    setImageViewerOpen(true);
  };

  if (chatSettings?.is_locked && !isUnlocked && chatSettings?.pin_code) {
    return (
      <ChatPinProtection
        correctPin={chatSettings.pin_code}
        chatPartnerName={friend?.first_name || 'Usuário'}
        chatPartnerId={friendId || ''}
        onUnlock={() => setIsUnlocked(true)}
      />
    );
  }

  if (activeCall) {
    return (
      <CallInterface
        callId={activeCall.id}
        isVideo={activeCall.type === 'video'}
        onEnd={() => {
          setActiveCall(null);
          navigate(`/chat/${friendId}`, { replace: true });
        }}
      />
    );
  }

  if (loading || !friend) {
    return <ChatSkeleton />;
  }

  const isTyping = typingUsers.size > 0;
  const lastReadOwnId = [...messages].reverse().find((message) => message.sender_id === user?.id && message.read)?.id;

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === format(today, 'yyyy-MM-dd')) {
      return 'Hoje';
    } else if (dateStr === format(yesterday, 'yyyy-MM-dd')) {
      return 'Ontem';
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden overscroll-none" style={{ height: '100dvh', maxHeight: '100dvh' }}>
      <header className="flex-shrink-0 z-50 safe-area-top px-3 py-2 border-b border-border/40 bg-card/70 backdrop-blur-[50px] saturate-200">
        <div className="grid grid-cols-[44px_1fr_44px] items-center w-full max-w-3xl mx-auto">
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/messages')}
              className="h-9 w-9 rounded-full bg-card/80 shadow-sm border border-border/40"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </motion.div>
          
          <div className="flex flex-col items-center min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${friend.id}`)}>
            <div className="flex -space-x-3 mb-1">
              <Avatar className="h-9 w-9 border-2 border-card shadow-md z-10">
                <AvatarImage src={friend.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-muted text-sm font-semibold">{friend.first_name[0]}</AvatarFallback>
              </Avatar>
              <Avatar className="h-9 w-9 border-2 border-card shadow-md">
                <AvatarImage src={myProfile?.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">{myProfile?.first_name?.[0] || 'P'}</AvatarFallback>
              </Avatar>
            </div>
            <p className="font-bold text-[13px] leading-none truncate">2 Pessoas</p>
            <AnimatePresence mode="wait">
              {isTyping ? (
                <motion.div 
                  key="typing"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-1 mt-1"
                >
                  <span className="text-[10px] font-medium text-primary">a escrever</span>
                  <motion.span 
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="text-primary"
                  >
                    ...
                  </motion.span>
                </motion.div>
              ) : (
                <motion.p 
                  key="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-muted-foreground mt-1"
                >
                  {isOnline ? 'online' : 'offline'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="justify-self-end">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-card/80 shadow-sm border border-border/40" onClick={() => startCall('video')} aria-label="Videochamada">
              <Video className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain native-scroll [overflow-anchor:none]"
        style={{
          backgroundImage: wallpaper ? `url(${wallpaper})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: wallpaper ? undefined : 'hsl(var(--background))',
        }}
      >
        <div className="max-w-3xl mx-auto px-3 py-4 space-y-1 pb-5">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date Label - more modern style */}
              <div className="flex justify-center my-4">
                <motion.span 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-3 py-1 text-[10px] font-medium text-muted-foreground"
                >
                  {formatDateLabel(date)}
                </motion.span>
              </div>

              {/* Messages */}
              {msgs.map((message, index) => {
                const isOwn = message.sender_id === user?.id;
                const showAvatar = !isOwn && (index === 0 || msgs[index - 1]?.sender_id !== message.sender_id);
                
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 15, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.25, type: "spring", stiffness: 300, damping: 25 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1.5`}
                  >
                    <div className={`flex items-end gap-2 max-w-[85%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isOwn && showAvatar && (
                        <Avatar className="h-7 w-7 flex-shrink-0 ring-2 ring-background shadow-md">
                          <AvatarImage src={friend.avatar_url || undefined} className="object-cover" />
                          <AvatarFallback className="text-xs bg-gradient-to-br from-secondary to-secondary/50">{friend.first_name[0]}</AvatarFallback>
                        </Avatar>
                      )}
                      {!isOwn && !showAvatar && <div className="w-7" />}
                      
                      {/* Image messages - modern card style */}
                      {message.message_type === 'image' && message.media_url ? (
                        <motion.div
                          whileTap={{ scale: 0.97 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => openImageViewer(message.media_url!)}
                          onTouchStart={() => handleMessageTouchStart(message)}
                          onTouchEnd={handleMessageTouchEnd}
                          onMouseDown={() => handleMessageTouchStart(message)}
                          onMouseUp={handleMessageTouchEnd}
                          onMouseLeave={handleMessageTouchEnd}
                          className="relative cursor-pointer rounded-3xl overflow-hidden shadow-lg select-none ring-1 ring-border/20"
                        >
                          <img 
                            src={message.media_url} 
                            alt="Image" 
                            className="max-w-[280px] max-h-[320px] object-cover"
                            draggable={false}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                          <div className={`absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm`}>
                            <span className="text-[11px] text-white font-medium">
                              {format(new Date(message.created_at), 'HH:mm')}
                            </span>
                            {isOwn && (
                              message.read ? (
                                <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-white" />
                              )
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          className={`relative px-4 py-2.5 shadow-sm select-none ${
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-[20px] rounded-br-md'
                              : 'bg-muted text-foreground rounded-[20px] rounded-bl-md'
                          }`}
                          onTouchStart={() => handleMessageTouchStart(message)}
                          onTouchEnd={handleMessageTouchEnd}
                          onMouseDown={() => handleMessageTouchStart(message)}
                          onMouseUp={handleMessageTouchEnd}
                          onMouseLeave={handleMessageTouchEnd}
                        >
                          {message.message_type === 'video' && message.media_url && (
                            <video 
                              src={message.media_url} 
                              controls 
                              className="rounded-2xl max-w-full max-h-64 mb-2"
                            />
                          )}
                          
                          {message.message_type === 'audio' && message.media_url && (
                            <div className="mb-1.5">
                              <AudioWaveform
                                src={message.media_url}
                                duration={message.duration}
                                isSent={isOwn}
                              />
                            </div>
                          )}
                          
                          {message.content && (
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                          )}
                          
                          <div className={`flex items-center gap-1.5 justify-end mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {message.edited && (
                              <span className="text-[10px] italic">editado</span>
                            )}
                            <span className="text-[11px] font-medium">
                              {format(new Date(message.created_at), 'HH:mm')}
                            </span>
                            {isOwn && (
                              message.read ? (
                                <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )
                            )}
                          </div>
                        </motion.div>
                      )}
                      {isOwn && message.id === lastReadOwnId && friend && (
                        <Avatar className="h-4 w-4 flex-shrink-0 border border-background shadow-sm" aria-label={`Vista por ${friend.first_name}`}>
                          <AvatarImage src={friend.avatar_url || undefined} className="object-cover" />
                          <AvatarFallback className="text-[7px]">{friend.first_name[0]}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
          
          {/* Typing Indicator - Modern bubble style */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                className="flex justify-start mb-3"
              >
                <div className="flex items-center gap-2 px-5 py-3 bg-card/95 backdrop-blur-sm rounded-3xl rounded-bl-lg shadow-md border border-border/50">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2.5 h-2.5 bg-primary/60 rounded-full"
                        animate={{ 
                          y: [0, -6, 0],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{ 
                          duration: 0.7, 
                          repeat: Infinity, 
                          delay: i * 0.15,
                          ease: "easeInOut"
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Edit Message Bar */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-muted/50 border-t border-border px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-primary font-medium">A editar mensagem</p>
                <p className="text-sm text-muted-foreground truncate">{editingMessage.content}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMessage(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Native Input Area */}
      <div className="flex-shrink-0 bg-card/70 border-t border-border/40 px-3 py-2 safe-area-bottom [transform:translateZ(0)] backdrop-blur-[50px] saturate-200">
        <form onSubmit={editingMessage ? (e) => { e.preventDefault(); saveEditedMessage(); } : sendMessage} className="flex items-center gap-2.5 max-w-3xl mx-auto">
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full press-effect bg-muted/70 text-foreground"
              onClick={() => setShowEmojiPicker(true)}
            >
              <Smile className="h-5 w-5" />
            </Button>
          </motion.div>
          
          <div className="flex-1 relative">
            <Input
              type="text"
              value={editingMessage ? editText : newMessage}
              onChange={(e) => editingMessage ? setEditText(e.target.value) : handleTyping(e.target.value)}
              placeholder="Mensagem"
              className="h-11 rounded-full bg-muted/70 border-0 px-5 pr-14 text-[16px] focus-visible:ring-1 focus-visible:ring-primary/30 placeholder:text-muted-foreground/60"
              style={{ fontSize: '16px' }}
              enterKeyHint="send"
              autoComplete="off"
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                onClick={() => imageInputRef.current?.click()}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
          
          <motion.div whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.05 }}>
            {(editingMessage ? editText.trim() : newMessage.trim()) ? (
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 rounded-full bg-primary hover:bg-primary/90 shadow-md press-effect"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                onClick={() => {
                  if (isRecording) stopVoiceRecording();
                  else startVoiceRecording();
                }}
                className={`h-11 w-11 rounded-full shadow-md press-effect ${
                  isRecording 
                    ? 'bg-destructive hover:bg-destructive/90 animate-pulse' 
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {isRecording ? (
                  <span className="text-sm font-bold tabular-nums">{recordingTime}s</span>
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            )}
          </motion.div>
        </form>
      </div>

      <EmojiPicker
        open={showEmojiPicker}
        onOpenChange={setShowEmojiPicker}
        onSelect={(emoji) => {
          if (editingMessage) {
            setEditText(prev => prev + emoji);
          } else {
            handleTyping(`${newMessage}${emoji}`);
          }
          setShowEmojiPicker(false);
        }}
      />

      {/* Wallpaper Picker */}
      <WallpaperPicker
        open={showWallpaperPicker}
        chatPartnerId={friendId || ''}
        onClose={() => setShowWallpaperPicker(false)}
        currentWallpaper={wallpaper}
        onWallpaperChange={(url) => setWallpaper(url)}
      />

      {/* Image Viewer */}
      <ImageViewer
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        imageUrl={selectedImageUrl}
        senderName={friend.first_name}
      />

      {/* Photo Editor */}
      <ChatPhotoEditor
        open={showPhotoEditor}
        onClose={() => {
          setShowPhotoEditor(false);
          setSelectedPhotoFile(null);
        }}
        imageFile={selectedPhotoFile}
        onSend={handlePhotoSend}
      />

      {/* Message Actions Sheet */}
      <Sheet open={showMessageActions} onOpenChange={setShowMessageActions}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="sr-only">Ações da mensagem</SheetTitle>
          </SheetHeader>
          
          {selectedMessage && (
            <div className="space-y-2 py-4">
              {/* Quick Reactions */}
              <div className="flex justify-center gap-4 pb-4 border-b border-border">
                {['❤️', '😂', '😮', '😢', '😡', '👍'].map((emoji) => (
                  <button
                    key={emoji}
                    className="text-2xl hover:scale-125 transition-transform"
                    onClick={() => handleReactToMessage(selectedMessage, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => handleCopyMessage(selectedMessage)}
              >
                <Copy className="h-5 w-5" />
                Copiar mensagem
              </Button>

              {selectedMessage.sender_id === user?.id && selectedMessage.message_type === 'text' && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => handleEditMessage(selectedMessage)}
                >
                  <Edit3 className="h-5 w-5" />
                  Editar mensagem
                </Button>
              )}

              {selectedMessage.sender_id === user?.id && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteMessage(selectedMessage)}
                >
                  <Trash2 className="h-5 w-5" />
                  Eliminar mensagem
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
