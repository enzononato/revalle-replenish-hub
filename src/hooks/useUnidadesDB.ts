import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Unidade } from '@/types';
import { toast } from 'sonner';

export function useUnidadesDB() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnidades = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('unidades')
        .select('*')
        .order('nome');

      if (error) throw error;

      const mapped: Unidade[] = (data || []).map((u) => ({
        id: u.id,
        nome: u.nome,
        codigo: u.codigo,
        cnpj: u.cnpj || '',
        createdAt: u.created_at || new Date().toISOString(),
      }));

      setUnidades(mapped);
    } catch (error) {
      console.error('Erro ao buscar unidades:', error);
      toast.error('Erro ao carregar unidades');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnidades();
  }, [fetchUnidades]);

  const addUnidade = async (unidade: Omit<Unidade, 'id' | 'createdAt'>) => {
    try {
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

      const newUnidade: Unidade = {
        id: data.id,
        nome: data.nome,
        codigo: data.codigo,
        cnpj: data.cnpj || '',
        createdAt: data.created_at || new Date().toISOString(),
      };

      setUnidades((prev) => [...prev, newUnidade]);
      toast.success('Unidade cadastrada com sucesso!');
      return newUnidade;
    } catch (error: any) {
      console.error('Erro ao adicionar unidade:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma unidade com este código');
      } else {
        toast.error('Erro ao cadastrar unidade');
      }
      throw error;
    }
  };

  const updateUnidade = async (id: string, updates: Partial<Omit<Unidade, 'id' | 'createdAt'>>) => {
    try {
      const { error } = await supabase
        .from('unidades')
        .update({
          nome: updates.nome,
          codigo: updates.codigo,
          cnpj: updates.cnpj || null,
        })
        .eq('id', id);

      if (error) throw error;

      setUnidades((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
      );
      toast.success('Unidade atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar unidade:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma unidade com este código');
      } else {
        toast.error('Erro ao atualizar unidade');
      }
      throw error;
    }
  };

  const deleteUnidade = async (id: string) => {
    try {
      const { error } = await supabase.from('unidades').delete().eq('id', id);

      if (error) throw error;

      setUnidades((prev) => prev.filter((u) => u.id !== id));
      toast.success('Unidade excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir unidade:', error);
      toast.error('Erro ao excluir unidade');
      throw error;
    }
  };

  const importUnidades = async (unidadesData: Omit<Unidade, 'id' | 'createdAt'>[]) => {
    try {
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

      await fetchUnidades();
      toast.success(`${unidadesData.length} unidades importadas com sucesso!`);
    } catch (error) {
      console.error('Erro ao importar unidades:', error);
      toast.error('Erro ao importar unidades');
      throw error;
    }
  };

  return {
    unidades,
    isLoading,
    addUnidade,
    updateUnidade,
    deleteUnidade,
    importUnidades,
    refetch: fetchUnidades,
  };
}
