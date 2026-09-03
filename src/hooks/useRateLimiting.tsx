import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RateLimitResult {
  allowed: boolean;
  count: number;
  suspended: boolean;
  suspended_until?: string;
}

export function useRateLimiting() {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const checkLimit = useCallback(async (
    actionType: 'like' | 'follow' | 'comment' | 'message',
    limit: number = 10
  ): Promise<boolean> => {
    if (!user) return false;
    
    setIsChecking(true);
    
    try {
      const { data, error } = await supabase.rpc('check_action_limit', {
        _user_id: user.id,
        _action_type: actionType,
        _limit: limit
      });
      
      if (error) {
        console.error('Rate limit check error:', error);
        return true; // Allow on error to avoid blocking users
      }
      
      if (!data) {
        return true;
      }
      
      const result = data as unknown as RateLimitResult;
      
      if (!result.allowed) {
        if (result.suspended) {
          const until = result.suspended_until 
            ? new Date(result.suspended_until).toLocaleString('pt-BR')
            : '24 horas';
          
          toast.error(`Estás suspenso até ${until}`, {
            description: `Limite de ${actionType} excedido.`,
            duration: 5000
          });
        }
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Rate limit error:', err);
      return true; // Allow on error
    } finally {
      setIsChecking(false);
    }
  }, [user]);

  // Reações e comentários são ilimitados — sem travar por quantidade.
  const checkLikeLimit = useCallback(async () => true, []);
  const checkCommentLimit = useCallback(async () => true, []);
  const checkFollowLimit = useCallback(() => checkLimit('follow', 20), [checkLimit]);


  return {
    checkLimit,
    checkLikeLimit,
    checkFollowLimit,
    checkCommentLimit,
    isChecking
  };
}
