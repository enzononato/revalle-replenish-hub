import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Motorista, FuncaoMotorista, SetorMotorista } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface MotoristaAuthContextType {
  motorista: Motorista | null;
  isAuthenticated: boolean;
  login: (codigo: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const MotoristaAuthContext = createContext<MotoristaAuthContextType | undefined>(undefined);

const MOTORISTA_STORAGE_KEY = 'motorista_session';

interface MotoristaDB {
  id: string;
  nome: string;
  codigo: string;
  cpf: string | null;
  data_nascimento: string | null;
  unidade: string;
  funcao: string;
  setor: string;
  whatsapp: string | null;
  email: string | null;
  senha: string | null;
  created_at: string | null;
}

const UNIDADE_PETROLINA = 'Revalle Petrolina';

const dbToMotorista = (db: MotoristaDB): Motorista => ({
  id: db.id,
  nome: db.nome,
  codigo: db.codigo,
  cpf: db.cpf || undefined,
  dataNascimento: db.data_nascimento || '',
  unidade: db.unidade,
  funcao: db.funcao as FuncaoMotorista,
  setor: db.setor as SetorMotorista,
  whatsapp: db.whatsapp || undefined,
  email: db.email || undefined,
  senha: db.senha || undefined,
  createdAt: db.created_at || new Date().toISOString(),
});

export function MotoristaAuthProvider({ children }: { children: ReactNode }) {
  const [motorista, setMotorista] = useState<Motorista | null>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem(MOTORISTA_STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setMotorista(parsed);
      } catch {
        localStorage.removeItem(MOTORISTA_STORAGE_KEY);
      }
    }
  }, []);

  const logLoginAttempt = async (
    identificadorLog: string,
    tipo: string,
    sucesso: boolean,
    erro?: string,
    motoristaData?: { id: string; nome: string; unidade: string }
  ) => {
    try {
      await supabase.from('motorista_login_logs').insert({
        identificador: identificadorLog,
        identificador_tipo: tipo,
        sucesso,
        erro: erro || null,
        motorista_id: motoristaData?.id || null,
        motorista_nome: motoristaData?.nome || null,
        unidade: motoristaData?.unidade || null,
      });
    } catch (e) {
      console.error('Erro ao registrar log de login:', e);
    }
  };

  const login = async (identificador: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    // Limpar o identificador (remover formatação de CPF se houver)
    const identificadorLimpo = identificador.replace(/[.\-]/g, '').trim();
    
    // Primeiro, tentar buscar por CPF (para unidades diferentes de Petrolina)
    const { data: porCpf, error: cpfError } = await supabase
      .from('motoristas')
      .select('*')
      .eq('cpf', identificadorLimpo)
      .neq('unidade', UNIDADE_PETROLINA)
      .maybeSingle();

    // Se encontrou por CPF e não é Petrolina
    if (porCpf) {
      const foundMotorista = dbToMotorista(porCpf as MotoristaDB);
      
      if (foundMotorista.senha !== senha) {
        await logLoginAttempt(identificadorLimpo, 'cpf', false, 'Senha incorreta', { id: foundMotorista.id, nome: foundMotorista.nome, unidade: foundMotorista.unidade });
        return { success: false, error: 'Senha incorreta' };
      }

      await logLoginAttempt(identificadorLimpo, 'cpf', true, undefined, { id: foundMotorista.id, nome: foundMotorista.nome, unidade: foundMotorista.unidade });
      setMotorista(foundMotorista);
      localStorage.setItem(MOTORISTA_STORAGE_KEY, JSON.stringify(foundMotorista));
      return { success: true };
    }

    // Se a busca por CPF deu erro (ex: múltiplos resultados)
    if (cpfError) {
      await logLoginAttempt(identificadorLimpo, 'cpf', false, `Erro na busca: ${cpfError.message}`);
      return { success: false, error: 'Erro ao buscar motorista. Contate o suporte.' };
    }

    // Se não encontrou por CPF, buscar por código promax (apenas para Petrolina)
    const { data: porCodigo, error } = await supabase
      .from('motoristas')
      .select('*')
      .eq('codigo', identificador)
      .eq('unidade', UNIDADE_PETROLINA)
      .maybeSingle();

    if (error || !porCodigo) {
      await logLoginAttempt(identificadorLimpo, 'codigo', false, error ? `Erro: ${error.message}` : 'Motorista não encontrado');
      return { success: false, error: 'CPF ou código de motorista não encontrado' };
    }

    const foundMotorista = dbToMotorista(porCodigo as MotoristaDB);

    if (foundMotorista.senha !== senha) {
      await logLoginAttempt(identificador, 'codigo', false, 'Senha incorreta', { id: foundMotorista.id, nome: foundMotorista.nome, unidade: foundMotorista.unidade });
      return { success: false, error: 'Senha incorreta' };
    }

    await logLoginAttempt(identificador, 'codigo', true, undefined, { id: foundMotorista.id, nome: foundMotorista.nome, unidade: foundMotorista.unidade });
    setMotorista(foundMotorista);
    localStorage.setItem(MOTORISTA_STORAGE_KEY, JSON.stringify(foundMotorista));
    return { success: true };
  };

  const logout = () => {
    setMotorista(null);
    localStorage.removeItem(MOTORISTA_STORAGE_KEY);
  };

  return (
    <MotoristaAuthContext.Provider value={{
      motorista,
      isAuthenticated: !!motorista,
      login,
      logout
    }}>
      {children}
    </MotoristaAuthContext.Provider>
  );
}

export function useMotoristaAuth() {
  const context = useContext(MotoristaAuthContext);
  if (!context) {
    throw new Error('useMotoristaAuth must be used within MotoristaAuthProvider');
  }
  return context;
}
