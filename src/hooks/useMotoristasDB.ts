import { useState, useEffect, useCallback } from 'react';
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
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMotoristas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from('motoristas')
      .select('*')
      .order('nome', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      toast.error('Erro ao carregar motoristas');
      setIsLoading(false);
      return;
    }

    setMotoristas((data as MotoristaDB[]).map(dbToMotorista));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchMotoristas();
  }, [fetchMotoristas]);

  const addMotorista = async (motorista: Omit<Motorista, 'id' | 'createdAt'>): Promise<boolean> => {
    const { error: insertError } = await supabase
      .from('motoristas')
      .insert([motoristaToDB(motorista as Motorista)]);

    if (insertError) {
      toast.error(`Erro ao cadastrar motorista: ${insertError.message}`);
      return false;
    }

    await fetchMotoristas();
    toast.success('Motorista cadastrado com sucesso!');
    return true;
  };

  const updateMotorista = async (id: string, motorista: Partial<Motorista>): Promise<boolean> => {
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

    if (updateError) {
      toast.error(`Erro ao atualizar motorista: ${updateError.message}`);
      return false;
    }

    await fetchMotoristas();
    toast.success('Motorista atualizado com sucesso!');
    return true;
  };

  const deleteMotorista = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('motoristas')
      .delete()
      .eq('id', id);

    if (deleteError) {
      toast.error(`Erro ao excluir motorista: ${deleteError.message}`);
      return false;
    }

    await fetchMotoristas();
    toast.success('Motorista excluído com sucesso!');
    return true;
  };

  const importMotoristas = async (newMotoristas: Omit<Motorista, 'id' | 'createdAt'>[]): Promise<boolean> => {
    // Deduplicar por código (manter o último registro de cada código)
    const uniqueMap = new Map<string, Omit<Motorista, 'id' | 'createdAt'>>();
    newMotoristas.forEach(m => uniqueMap.set(m.codigo, m));
    const uniqueMotoristas = Array.from(uniqueMap.values());
    
    // Usar upsert para atualizar existentes e inserir novos (baseado no código único)
    const motoristasDB = uniqueMotoristas.map(m => motoristaToDB(m as Motorista));
    
    const { error: upsertError } = await supabase
      .from('motoristas')
      .upsert(motoristasDB, { onConflict: 'codigo' });

    if (upsertError) {
      toast.error(`Erro ao importar motoristas: ${upsertError.message}`);
      return false;
    }

    await fetchMotoristas();
    toast.success(`${uniqueMotoristas.length} motoristas importados com sucesso!`);
    return true;
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
    error,
    fetchMotoristas,
    addMotorista,
    updateMotorista,
    deleteMotorista,
    importMotoristas,
    getMotoristaByCode,
  };
}
