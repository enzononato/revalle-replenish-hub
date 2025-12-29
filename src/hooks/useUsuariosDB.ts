import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  nivel: 'admin' | 'distribuicao' | 'conferente';
  unidades: string[];
  telefone?: string;
  createdAt: string;
}

export function useUsuariosDB() {
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading } = useQuery({
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
        telefone: u.telefone || undefined,
        createdAt: u.created_at || new Date().toISOString(),
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  const addMutation = useMutation({
    mutationFn: async (usuario: Omit<Usuario, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_email: usuario.email,
          nome: usuario.nome,
          nivel: usuario.nivel,
          unidade: usuario.unidades.join(', '),
          telefone: usuario.telefone || null,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        nome: data.nome || '',
        email: data.user_email,
        nivel: (data.nivel as Usuario['nivel']) || 'conferente',
        unidades: data.unidade ? data.unidade.split(',').map(s => s.trim()) : [],
        telefone: data.telefone || undefined,
        createdAt: data.created_at || new Date().toISOString(),
      } as Usuario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário cadastrado com sucesso!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Já existe um usuário com este email');
      } else {
        toast.error('Erro ao cadastrar usuário');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<Usuario, 'id' | 'createdAt'>> }) => {
      const updateData: Record<string, any> = {};
      
      if (updates.nome !== undefined) updateData.nome = updates.nome;
      if (updates.email !== undefined) updateData.user_email = updates.email;
      if (updates.nivel !== undefined) updateData.nivel = updates.nivel;
      if (updates.unidades !== undefined) updateData.unidade = updates.unidades.join(', ');
      if (updates.telefone !== undefined) updateData.telefone = updates.telefone || null;

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
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Já existe um usuário com este email');
      } else {
        toast.error('Erro ao atualizar usuário');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_profiles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir usuário');
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
    refetch: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  };
}
