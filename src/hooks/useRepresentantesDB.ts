import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RepresentanteDB {
  id: string;
  nome: string;
  cpf: string;
  unidade: string;
  created_at: string;
}

export function useRepresentantesDB() {
  const queryClient = useQueryClient();

  const { data: representantes = [], isLoading } = useQuery({
    queryKey: ['representantes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('representantes_public' as any)
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      return data as unknown as RepresentanteDB[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const addMutation = useMutation({
    mutationFn: async (rn: { nome: string; cpf: string; unidade: string; senha: string }) => {
      const { error } = await supabase.from('representantes' as any).insert([rn]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['representantes'] }); toast.success('RN cadastrado com sucesso!'); },
    onError: (e: Error) => toast.error(`Erro ao cadastrar RN: ${e.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase.from('representantes' as any).update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['representantes'] }); toast.success('RN atualizado com sucesso!'); },
    onError: (e: Error) => toast.error(`Erro ao atualizar RN: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('representantes' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['representantes'] }); toast.success('RN excluído com sucesso!'); },
    onError: (e: Error) => toast.error(`Erro ao excluir RN: ${e.message}`),
  });

  const addRepresentante = async (rn: { nome: string; cpf: string; unidade: string; senha: string }) => {
    try { await addMutation.mutateAsync(rn); return true; } catch { return false; }
  };

  const updateRepresentante = async (id: string, data: Record<string, unknown>) => {
    try { await updateMutation.mutateAsync({ id, data }); return true; } catch { return false; }
  };

  const deleteRepresentante = async (id: string) => {
    try { await deleteMutation.mutateAsync(id); return true; } catch { return false; }
  };

  return { representantes, isLoading, addRepresentante, updateRepresentante, deleteRepresentante };
}
