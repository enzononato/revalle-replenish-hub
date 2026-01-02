import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Gestor {
  id: string;
  nome: string;
  whatsapp: string;
  unidades: string[];
  created_at: string;
  updated_at: string;
}

export function useGestoresDB() {
  const queryClient = useQueryClient();

  const { data: gestores = [], isLoading, refetch } = useQuery({
    queryKey: ['gestores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestores')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao buscar gestores:', error);
        throw error;
      }

      return data as Gestor[];
    },
  });

  const addGestorMutation = useMutation({
    mutationFn: async (gestor: Omit<Gestor, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('gestores')
        .insert(gestor)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestores'] });
      toast.success('Gestor adicionado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao adicionar gestor:', error);
      toast.error('Erro ao adicionar gestor');
    },
  });

  const updateGestorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<Gestor, 'id' | 'created_at' | 'updated_at'>> }) => {
      const { data, error } = await supabase
        .from('gestores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestores'] });
      toast.success('Gestor atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar gestor:', error);
      toast.error('Erro ao atualizar gestor');
    },
  });

  const deleteGestorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gestores')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestores'] });
      toast.success('Gestor removido com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao remover gestor:', error);
      toast.error('Erro ao remover gestor');
    },
  });

  return {
    gestores,
    isLoading,
    refetch,
    addGestor: addGestorMutation.mutateAsync,
    updateGestor: updateGestorMutation.mutateAsync,
    deleteGestor: deleteGestorMutation.mutateAsync,
    isAdding: addGestorMutation.isPending,
    isUpdating: updateGestorMutation.isPending,
    isDeleting: deleteGestorMutation.isPending,
  };
}
