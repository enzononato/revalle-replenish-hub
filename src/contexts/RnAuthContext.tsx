import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { classifyAuthError, friendlyMessage, withRetry } from '@/lib/authErrorHandling';

export interface Representante {
  id: string;
  nome: string;
  cpf: string;
  unidade: string;
  created_at: string;
}

interface RnAuthContextType {
  representante: Representante | null;
  isAuthenticated: boolean;
  login: (cpf: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const RnAuthContext = createContext<RnAuthContextType | undefined>(undefined);

const RN_STORAGE_KEY = 'rn_session';

export function RnAuthProvider({ children }: { children: ReactNode }) {
  const [representante, setRepresentante] = useState<Representante | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(RN_STORAGE_KEY);
    if (stored) {
      try {
        setRepresentante(JSON.parse(stored));
      } catch {
        localStorage.removeItem(RN_STORAGE_KEY);
      }
    }
  }, []);

  const login = async (cpf: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await withRetry(async () => {
        const { data, error } = await supabase.functions.invoke('rn-login', {
          body: { cpf, senha },
        });
        if (error) throw error;
        if (data?.success === false || data?.error) {
          const credErr = new Error(data.error || 'Erro ao fazer login');
          throw credErr;
        }
        return data;
      });

      if (data?.representante) {
        setRepresentante(data.representante);
        localStorage.setItem(RN_STORAGE_KEY, JSON.stringify(data.representante));
        return { success: true };
      }

      return { success: false, error: 'Resposta inesperada do servidor' };
    } catch (err) {
      const classified = classifyAuthError(err);
      console.error(`[AUTH:rn] Login failed (${classified.type}):`, classified.message);
      return { success: false, error: friendlyMessage(classified) };
    }
  };

  const logout = () => {
    setRepresentante(null);
    localStorage.removeItem(RN_STORAGE_KEY);
  };

  return (
    <RnAuthContext.Provider value={{ representante, isAuthenticated: !!representante, login, logout }}>
      {children}
    </RnAuthContext.Provider>
  );
}

export function useRnAuth() {
  const context = useContext(RnAuthContext);
  if (!context) {
    throw new Error('useRnAuth must be used within RnAuthProvider');
  }
  return context;
}
