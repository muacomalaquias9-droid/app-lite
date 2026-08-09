import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { requestNotificationPermission, showNotification } from '@/utils/pushNotifications';
import logo from '@/assets/blynk-logo.jpg';

interface SecurityAlert {
  id: string;
  alert_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function useSecurityAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadAlerts = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('security_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setAlerts(data as SecurityAlert[]);
      setUnreadCount(data.filter(a => !a.is_read).length);
    }
  }, [user]);

  const markAsRead = async (alertId: string) => {
    const { error } = await supabase
      .from('security_alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    if (!error) {
      await loadAlerts();
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('security_alerts')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      await loadAlerts();
    }
  };

  useEffect(() => {
    if (!user) return;

    loadAlerts();

    // Subscribe to new security alerts
    const channel = supabase
      .channel('security-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_alerts',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const newAlert = payload.new as SecurityAlert;
          
          // Show toast notification
          toast.warning(newAlert.message, {
            duration: 10000,
            icon: '🔐'
          });

          // Show push notification
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            showNotification('Alerta de Segurança - Blynk', {
              body: newAlert.message,
              icon: logo,
              requireInteraction: true
            });
          }

          await loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadAlerts]);

  return {
    alerts,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshAlerts: loadAlerts
  };
}
