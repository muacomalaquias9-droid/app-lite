import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { showMessageNotification, playNotificationSound } from '@/utils/pushNotifications';
import VerificationBadge from '@/components/VerificationBadge';
import { enablePhonePush } from '@/utils/webPush';

interface Notification {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  verified?: boolean;
  badgeType?: string | null;
}

interface UnreadCount {
  [senderId: string]: number;
}

export const MessageNotification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});

  // Keep this phone registered for push automatically
  useEffect(() => {
    if (!user || !('Notification' in window)) return;
    if (Notification.permission === 'granted') { enablePhonePush(user.id, false); return; }
    if (Notification.permission !== 'default') return;
    const ask = () => enablePhonePush(user.id, true);
    window.addEventListener('pointerdown', ask, { once: true });
    return () => window.removeEventListener('pointerdown', ask);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('new-messages-global')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload: any) => {
          // Get sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, avatar_url, verified, badge_type')
            .eq('id', payload.new.sender_id)
            .single();

          if (profile) {
            // Get unread count from this sender
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('sender_id', payload.new.sender_id)
              .eq('receiver_id', user.id)
              .eq('read', false);

            const notifData: Notification = {
              id: payload.new.id,
              senderId: payload.new.sender_id,
              senderName: profile.first_name,
              senderAvatar: profile.avatar_url,
              content: payload.new.message_type === 'audio' 
                ? '🎤 Mensagem de voz' 
                : payload.new.message_type === 'image'
                ? '📷 Foto'
                : payload.new.message_type === 'video'
                ? '🎬 Vídeo'
                : payload.new.content || 'Nova mensagem',
              verified: profile.verified,
              badgeType: profile.badge_type,
            };

            setNotification(notifData);
            setUnreadCounts(prev => ({
              ...prev,
              [payload.new.sender_id]: count || 1
            }));

            // Play notification sound immediately
            playNotificationSound();

            // Show native push notification with WhatsApp-style actions
            showMessageNotification(
              profile.first_name,
              notifData.content,
              profile.avatar_url,
              payload.new.sender_id,
              payload.new.id
            );

            // Auto-hide after 5 seconds
            setTimeout(() => setNotification(null), 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleClick = () => {
    if (notification) {
      navigate(`/chat/${notification.senderId}`);
      setNotification(null);
    }
  };

  const unreadCount = notification ? (unreadCounts[notification.senderId] || 1) : 0;

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-[90%] max-w-sm"
        >
          <div
            onClick={handleClick}
            className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-4 cursor-pointer hover:bg-card transition-all"
          >
            <div className="flex items-center gap-3">
              {/* Avatar with story ring */}
              <div className="relative flex-shrink-0">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500">
                  <Avatar className="h-12 w-12 border-2 border-background">
                    <AvatarImage src={notification.senderAvatar || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                      {notification.senderName[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {/* Unread badge */}
                {unreadCount > 0 && (
                  <div className="absolute -bottom-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive flex items-center justify-center">
                    <span className="text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-semibold text-sm truncate">{notification.senderName}</p>
                  {notification.verified && (
                    <VerificationBadge 
                      verified={notification.verified} 
                      badgeType={notification.badgeType} 
                      className="w-3.5 h-3.5" 
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {notification.content}
                </p>
              </div>

              {/* Message icon */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotification(null);
                  }}
                  className="p-1.5 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
