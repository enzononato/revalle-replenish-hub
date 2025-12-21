import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OnlineUser {
  id: string;
  nome: string;
  nivel: string;
  unidade: string;
  online_at: string;
}

export function useUserPresence() {
  const { user, isAuthenticated } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences) => {
          if (Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as unknown as OnlineUser;
            if (presence.id && presence.nome) {
              users.push(presence);
            }
          }
        });
        
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id,
            nome: user.nome,
            nivel: user.nivel,
            unidade: user.unidade || '',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [isAuthenticated, user]);

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.some(u => u.id === userId);
  };

  return {
    onlineUsers,
    isUserOnline,
    onlineCount: onlineUsers.length,
  };
}
