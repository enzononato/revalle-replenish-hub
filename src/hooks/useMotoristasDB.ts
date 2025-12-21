import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Motorista, FuncaoMotorista, SetorMotorista } from '@/types';
import { toast } from 'sonner';

interface MotoristaDB {
  id: string;
  nome: string;
  codigo: string;
  data_nascimento: string | null;
  unidade: string;
  funcao: string;
  setor: string;
  whatsapp: string | null;
  email: string | null;
  senha: string | null;
  created_at: string | null;
}

// Converter do formato DB para o formato da aplicação
const dbToMotorista = (db: MotoristaDB): Motorista => ({
  id: db.id,
  nome: db.nome,
  codigo: db.codigo,
  dataNascimento: db.data_nascimento || '',
  unidade: db.unidade,
  funcao: db.funcao as FuncaoMotorista,
  setor: db.setor as SetorMotorista,
  whatsapp: db.whatsapp || undefined,
  email: db.email || undefined,
  senha: db.senha || undefined,
  createdAt: db.created_at || new Date().toISOString(),
});

// Converter do formato da aplicação para o formato DB
const motoristaToDB = (m: Motorista): Omit<MotoristaDB, 'id' | 'created_at'> => ({
  nome: m.nome,
  codigo: m.codigo,
  data_nascimento: m.dataNascimento || null,
  unidade: m.unidade,
  funcao: m.funcao,
  setor: m.setor,
  whatsapp: m.whatsapp || null,
  email: m.email || null,
  senha: m.senha || null,
});

export function useMotoristasDB() {
  const queryClient = useQueryClient();

  const { data: motoristas = [], isLoading, error } = useQuery({
    queryKey: ['motoristas'],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('motoristas')
        .select('*')
        .order('nome', { ascending: true });

      if (fetchError) throw fetchError;
      return (data as MotoristaDB[]).map(dbToMotorista);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const addMutation = useMutation({
    mutationFn: async (motorista: Omit<Motorista, 'id' | 'createdAt'>) => {
      const { error: insertError } = await supabase
        .from('motoristas')
        .insert([motoristaToDB(motorista as Motorista)]);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motoristas'] });
      toast.success('Motorista cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cadastrar motorista: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, motorista }: { id: string; motorista: Partial<Motorista> }) => {
      const updateData: Record<string, unknown> = {};
      
      if (motorista.nome !== undefined) updateData.nome = motorista.nome;
      if (motorista.codigo !== undefined) updateData.codigo = motorista.codigo;
      if (motorista.dataNascimento !== undefined) updateData.data_nascimento = motorista.dataNascimento;
      if (motorista.unidade !== undefined) updateData.unidade = motorista.unidade;
      if (motorista.funcao !== undefined) updateData.funcao = motorista.funcao;
      if (motorista.setor !== undefined) updateData.setor = motorista.setor;
      if (motorista.whatsapp !== undefined) updateData.whatsapp = motorista.whatsapp;
      if (motorista.email !== undefined) updateData.email = motorista.email;
      if (motorista.senha !== undefined && motorista.senha !== '') updateData.senha = motorista.senha;

      const { error: updateError } = await supabase
        .from('motoristas')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motoristas'] });
      toast.success('Motorista atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar motorista: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase
        .from('motoristas')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motoristas'] });
      toast.success('Motorista excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir motorista: ${error.message}`);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (newMotoristas: Omit<Motorista, 'id' | 'createdAt'>[]) => {
      // Deduplicar por código (manter o último registro de cada código)
      const uniqueMap = new Map<string, Omit<Motorista, 'id' | 'createdAt'>>();
      newMotoristas.forEach(m => uniqueMap.set(m.codigo, m));
      const uniqueMotoristas = Array.from(uniqueMap.values());
      
      const motoristasDB = uniqueMotoristas.map(m => motoristaToDB(m as Motorista));
      
      const { error: upsertError } = await supabase
        .from('motoristas')
        .upsert(motoristasDB, { onConflict: 'codigo' });

      if (upsertError) throw upsertError;
      return uniqueMotoristas.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['motoristas'] });
      toast.success(`${count} motoristas importados com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao importar motoristas: ${error.message}`);
    },
  });

  const addMotorista = async (motorista: Omit<Motorista, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      await addMutation.mutateAsync(motorista);
      return true;
    } catch {
      return false;
    }
  };

  const updateMotorista = async (id: string, motorista: Partial<Motorista>): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ id, motorista });
      return true;
    } catch {
      return false;
    }
  };

  const deleteMotorista = async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const importMotoristas = async (newMotoristas: Omit<Motorista, 'id' | 'createdAt'>[]): Promise<boolean> => {
    try {
      await importMutation.mutateAsync(newMotoristas);
      return true;
    } catch {
      return false;
    }
  };

  const getMotoristaByCode = async (codigo: string): Promise<Motorista | null> => {
    const { data, error: fetchError } = await supabase
      .from('motoristas')
      .select('*')
      .eq('codigo', codigo)
      .single();

    if (fetchError || !data) {
      return null;
    }

    return dbToMotorista(data as MotoristaDB);
  };

  return {
    motoristas,
    isLoading,
    error: error?.message || null,
    fetchMotoristas: () => queryClient.invalidateQueries({ queryKey: ['motoristas'] }),
    addMotorista,
    updateMotorista,
    deleteMotorista,
    importMotoristas,
    getMotoristaByCode,
  };
}
