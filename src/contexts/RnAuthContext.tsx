import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      const { data, error } = await supabase.functions.invoke('rn-login', {
        body: { cpf, senha },
      });

      if (error) {
        let friendlyError: string | undefined;
        try {
          const context = error.context as Response | null | undefined;
          if (context && typeof context === 'object' && 'json' in context && typeof context.json === 'function') {
            const errorBody = await context.json();
            if (errorBody?.error) friendlyError = errorBody.error;
          }
        } catch {}

        if (!friendlyError && typeof error.message === 'string') {
          const jsonMatch = error.message.match(/\{.*\}$/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed?.error) friendlyError = parsed.error;
            } catch {}
          }
        }

        return { success: false, error: friendlyError || error.message || 'Erro ao fazer login' };
      }

      if (data?.error || data?.success === false) {
        return { success: false, error: data.error || 'Erro ao fazer login' };
      }

      if (data?.representante) {
        setRepresentante(data.representante);
        localStorage.setItem(RN_STORAGE_KEY, JSON.stringify(data.representante));
        return { success: true };
      }

      return { success: false, error: 'Resposta inesperada do servidor' };
    } catch (err) {
      console.error('Erro no login do RN:', err);
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
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
