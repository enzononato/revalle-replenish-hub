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
  data_nascimento: string | null;
  unidade: string;
  funcao: string;
  setor: string;
  whatsapp: string | null;
  email: string | null;
  senha: string | null;
  created_at: string | null;
}

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

  const login = async (codigo: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase
      .from('motoristas')
      .select('*')
      .eq('codigo', codigo)
      .single();

    if (error || !data) {
      return { success: false, error: 'Código de motorista não encontrado' };
    }

    const foundMotorista = dbToMotorista(data as MotoristaDB);

    if (foundMotorista.senha !== senha) {
      return { success: false, error: 'Senha incorreta' };
    }

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
