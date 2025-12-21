import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_nome: string;
  sender_nivel: string;
  content: string;
  protocolo_id: string | null;
  protocolo_numero: string | null;
  created_at: string;
}

export interface ChatParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  user_nome: string;
  user_nivel: string;
  user_unidade: string | null;
  last_read_at: string | null;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  created_at: string;
  updated_at: string;
  tipo: 'individual' | 'grupo';
  nome: string | null;
  unidade: string | null;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export function useChatDB() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [totalUnread, setTotalUnread] = useState(0);

  // Fetch all conversations for the current user
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['chat-conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get all conversation IDs where user is a participant
      const { data: participations, error: partError } = await supabase
        .from('chat_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (partError) throw partError;
      if (!participations || participations.length === 0) return [];

      const conversationIds = participations.map(p => p.conversation_id);
      const lastReadMap = new Map(participations.map(p => [p.conversation_id, p.last_read_at]));

      // Get all conversations with their participants
      const { data: convs, error: convError } = await supabase
        .from('chat_conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // Get all participants for these conversations
      const { data: allParticipants, error: allPartError } = await supabase
        .from('chat_participants')
        .select('*')
        .in('conversation_id', conversationIds);

      if (allPartError) throw allPartError;

      // Get last message for each conversation
      const { data: lastMessages, error: msgError } = await supabase
        .from('chat_messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Get unread count for each conversation
      const conversationsWithDetails: ChatConversation[] = (convs || []).map(conv => {
        const participants = (allParticipants || []).filter(p => p.conversation_id === conv.id);
        const messages = (lastMessages || []).filter(m => m.conversation_id === conv.id);
        const lastMessage = messages[0];
        const lastReadAt = lastReadMap.get(conv.id);
        
        // Count messages after last_read_at from other users
        const unreadCount = messages.filter(m => 
          m.sender_id !== user.id && 
          (!lastReadAt || new Date(m.created_at) > new Date(lastReadAt))
        ).length;

        return {
          ...conv,
          tipo: conv.tipo as 'individual' | 'grupo',
          participants,
          lastMessage,
          unreadCount,
        };
      });

      return conversationsWithDetails;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Calculate total unread
  useEffect(() => {
    const total = conversations.reduce((acc, conv) => acc + conv.unreadCount, 0);
    setTotalUnread(total);
  }, [conversations]);

  // Fetch messages for a specific conversation
  const useConversationMessages = (conversationId: string | null) => {
    return useQuery({
      queryKey: ['chat-messages', conversationId],
      queryFn: async () => {
        if (!conversationId) return [];

        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data as ChatMessage[];
      },
      enabled: !!conversationId,
    });
  };

  // Get or create individual conversation with another user
  const getOrCreateConversation = async (otherUser: { id: string; nome: string; nivel: string; unidade: string }) => {
    if (!user) throw new Error('User not authenticated');

    // Check if conversation already exists between these two users
    const { data: myParticipations } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    const { data: theirParticipations } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', otherUser.id);

    // Find common conversation that is individual type
    const myConvIds = new Set(myParticipations?.map(p => p.conversation_id) || []);
    const commonConvIds = theirParticipations?.filter(p => myConvIds.has(p.conversation_id)).map(p => p.conversation_id) || [];

    if (commonConvIds.length > 0) {
      // Check if any of these is an individual conversation
      const { data: individualConv } = await supabase
        .from('chat_conversations')
        .select('id')
        .in('id', commonConvIds)
        .eq('tipo', 'individual')
        .limit(1)
        .maybeSingle();

      if (individualConv) {
        return individualConv.id;
      }
    }

    // Create new individual conversation
    const { data: newConv, error: convError } = await supabase
      .from('chat_conversations')
      .insert({ tipo: 'individual' })
      .select()
      .single();

    if (convError) throw convError;

    // Add both participants
    const { error: partError } = await supabase
      .from('chat_participants')
      .insert([
        {
          conversation_id: newConv.id,
          user_id: user.id,
          user_nome: user.nome,
          user_nivel: user.nivel,
          user_unidade: user.unidade,
        },
        {
          conversation_id: newConv.id,
          user_id: otherUser.id,
          user_nome: otherUser.nome,
          user_nivel: otherUser.nivel,
          user_unidade: otherUser.unidade,
        },
      ]);

    if (partError) throw partError;

    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    return newConv.id;
  };

  // Get or create unit group conversation
  const getOrCreateUnitGroup = async (unidade: string) => {
    if (!user) throw new Error('User not authenticated');

    // Check if unit group already exists
    const { data: existingGroup } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('tipo', 'grupo')
      .eq('unidade', unidade)
      .maybeSingle();

    if (existingGroup) {
      // Check if user is already a participant
      const { data: existingParticipation } = await supabase
        .from('chat_participants')
        .select('id')
        .eq('conversation_id', existingGroup.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingParticipation) {
        // Add user to the group
        await supabase
          .from('chat_participants')
          .insert({
            conversation_id: existingGroup.id,
            user_id: user.id,
            user_nome: user.nome,
            user_nivel: user.nivel,
            user_unidade: user.unidade,
          });
      }

      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      return existingGroup.id;
    }

    // Create new group conversation
    const { data: newConv, error: convError } = await supabase
      .from('chat_conversations')
      .insert({ 
        tipo: 'grupo', 
        nome: `Grupo ${unidade}`,
        unidade: unidade,
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add current user as first participant
    const { error: partError } = await supabase
      .from('chat_participants')
      .insert({
        conversation_id: newConv.id,
        user_id: user.id,
        user_nome: user.nome,
        user_nivel: user.nivel,
        user_unidade: user.unidade,
      });

    if (partError) throw partError;

    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    return newConv.id;
  };

  // Send a message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      content, 
      protocoloId, 
      protocoloNumero 
    }: { 
      conversationId: string; 
      content: string; 
      protocoloId?: string; 
      protocoloNumero?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_nome: user.nome,
          sender_nivel: user.nivel,
          content,
          protocolo_id: protocoloId || null,
          protocolo_numero: protocoloNumero || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  // Mark conversation as read
  const markAsRead = async (conversationId: string) => {
    if (!user) return;

    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
          queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    conversations,
    isLoadingConversations,
    totalUnread,
    useConversationMessages,
    getOrCreateConversation,
    getOrCreateUnitGroup,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    markAsRead,
  };
}
