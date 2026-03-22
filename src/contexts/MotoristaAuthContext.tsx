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

interface MotoristaEdgeFnResponse {
  id: string;
  nome: string;
  codigo: string;
  data_nascimento: string | null;
  unidade: string;
  funcao: string;
  setor: string;
  whatsapp: string | null;
  email: string | null;
  created_at: string | null;
}

const edgeToMotorista = (db: MotoristaEdgeFnResponse): Motorista => ({
  id: db.id,
  nome: db.nome,
  codigo: db.codigo,
  dataNascimento: db.data_nascimento || '',
  unidade: db.unidade,
  funcao: db.funcao as FuncaoMotorista,
  setor: db.setor as SetorMotorista,
  whatsapp: db.whatsapp || undefined,
  email: db.email || undefined,
  createdAt: db.created_at || new Date().toISOString(),
});

export function MotoristaAuthProvider({ children }: { children: ReactNode }) {
  const [motorista, setMotorista] = useState<Motorista | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(MOTORISTA_STORAGE_KEY);
    if (stored) {
      try {
        setMotorista(JSON.parse(stored));
      } catch {
        localStorage.removeItem(MOTORISTA_STORAGE_KEY);
      }
    }
  }, []);

  const login = async (identificador: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('motorista-login', {
        body: { identificador, senha },
      });

      if (error) {
        return { success: false, error: error.message || 'Erro ao fazer login' };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      if (data?.motorista) {
        const foundMotorista = edgeToMotorista(data.motorista);
        setMotorista(foundMotorista);
        localStorage.setItem(MOTORISTA_STORAGE_KEY, JSON.stringify(foundMotorista));
        return { success: true };
      }

      return { success: false, error: 'Resposta inesperada do servidor' };
    } catch (err) {
      console.error('Erro no login do motorista:', err);
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
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
