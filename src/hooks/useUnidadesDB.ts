import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Unidade } from '@/types';
import { toast } from 'sonner';

export function useUnidadesDB() {
  const queryClient = useQueryClient();

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['unidades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidades')
        .select('*')
        .order('nome');

      if (error) throw error;

      return (data || []).map((u): Unidade => ({
        id: u.id,
        nome: u.nome,
        codigo: u.codigo,
        cnpj: u.cnpj || '',
        createdAt: u.created_at || new Date().toISOString(),
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const addMutation = useMutation({
    mutationFn: async (unidade: Omit<Unidade, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('unidades')
        .insert({
          nome: unidade.nome,
          codigo: unidade.codigo,
          cnpj: unidade.cnpj || null,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        nome: data.nome,
        codigo: data.codigo,
        cnpj: data.cnpj || '',
        createdAt: data.created_at || new Date().toISOString(),
      } as Unidade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      toast.success('Unidade cadastrada com sucesso!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Já existe uma unidade com este código');
      } else {
        toast.error('Erro ao cadastrar unidade');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<Unidade, 'id' | 'createdAt'>> }) => {
      const { error } = await supabase
        .from('unidades')
        .update({
          nome: updates.nome,
          codigo: updates.codigo,
          cnpj: updates.cnpj || null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      toast.success('Unidade atualizada com sucesso!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Já existe uma unidade com este código');
      } else {
        toast.error('Erro ao atualizar unidade');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('unidades').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      toast.success('Unidade excluída com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir unidade');
    },
  });

  const importMutation = useMutation({
    mutationFn: async (unidadesData: Omit<Unidade, 'id' | 'createdAt'>[]) => {
      const toInsert = unidadesData.map((u) => ({
        nome: u.nome,
        codigo: u.codigo,
        cnpj: u.cnpj || null,
      }));

      const { error } = await supabase.from('unidades').upsert(toInsert, {
        onConflict: 'codigo',
        ignoreDuplicates: false,
      });

      if (error) throw error;
      return unidadesData.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      toast.success(`${count} unidades importadas com sucesso!`);
    },
    onError: () => {
      toast.error('Erro ao importar unidades');
    },
  });

  const addUnidade = async (unidade: Omit<Unidade, 'id' | 'createdAt'>) => {
    return addMutation.mutateAsync(unidade);
  };

  const updateUnidade = async (id: string, updates: Partial<Omit<Unidade, 'id' | 'createdAt'>>) => {
    await updateMutation.mutateAsync({ id, updates });
  };

  const deleteUnidade = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const importUnidades = async (unidadesData: Omit<Unidade, 'id' | 'createdAt'>[]) => {
    await importMutation.mutateAsync(unidadesData);
  };

  return {
    unidades,
    isLoading,
    addUnidade,
    updateUnidade,
    deleteUnidade,
    importUnidades,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['unidades'] }),
  };
}
