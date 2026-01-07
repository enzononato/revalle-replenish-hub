import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  nivel: 'admin' | 'distribuicao' | 'conferente';
  unidades: string[];
  createdAt: string;
  authUserId?: string;
}

interface CreateUsuarioInput {
  nome: string;
  email: string;
  senha: string;
  nivel: 'admin' | 'distribuicao' | 'conferente';
  unidades: string[];
}

export function useUsuariosDB() {
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading, refetch } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('nome');

      if (error) throw error;

      return (data || []).map((u): Usuario => ({
        id: u.id,
        nome: u.nome || '',
        email: u.user_email,
        nivel: (u.nivel as Usuario['nivel']) || 'conferente',
        unidades: u.unidade ? u.unidade.split(',').map(s => s.trim()) : [],
        createdAt: u.created_at || new Date().toISOString(),
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  const addMutation = useMutation({
    mutationFn: async (usuario: CreateUsuarioInput) => {
      // Usar edge function para criar usuário sem fazer login
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: usuario.email,
          password: usuario.senha,
          nome: usuario.nome,
          nivel: usuario.nivel,
          unidades: usuario.unidades,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao criar usuário');
      }

      if (data?.error) {
        if (data.error === 'EMAIL_EXISTS') {
          throw new Error('EMAIL_EXISTS');
        }
        throw new Error(data.error);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário criado com sucesso! Ele já pode fazer login.');
    },
    onError: (error: Error) => {
      if (error.message === 'EMAIL_EXISTS') {
        toast.error('Já existe um usuário com este email');
      } else {
        toast.error('Erro ao criar usuário: ' + (error.message || 'Erro desconhecido'));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<Usuario, 'id' | 'createdAt'>> }) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.nome !== undefined) updateData.nome = updates.nome;
      if (updates.email !== undefined) updateData.user_email = updates.email;
      if (updates.nivel !== undefined) updateData.nivel = updates.nivel;
      if (updates.unidades !== undefined) updateData.unidade = updates.unidades.join(', ');

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário atualizado com sucesso!');
    },
    onError: (error: { code?: string }) => {
      if (error.code === '23505') {
        toast.error('Já existe um usuário com este email');
      } else {
        toast.error('Erro ao atualizar usuário');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;
      
      // Verificar se realmente foi deletado
      if (!data || data.length === 0) {
        throw new Error('Você não tem permissão para excluir usuários. Apenas administradores podem fazer isso.');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir usuário');
    },
  });

  return {
    usuarios,
    isLoading,
    addUsuario: addMutation.mutateAsync,
    updateUsuario: updateMutation.mutateAsync,
    deleteUsuario: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch,
  };
}
