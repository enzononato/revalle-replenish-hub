import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Motorista } from '@/types';
import { mockMotoristas } from '@/data/mockData';

interface MotoristaAuthContextType {
  motorista: Motorista | null;
  isAuthenticated: boolean;
  login: (codigo: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const MotoristaAuthContext = createContext<MotoristaAuthContextType | undefined>(undefined);

const MOTORISTA_STORAGE_KEY = 'motorista_session';

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
    const foundMotorista = mockMotoristas.find(m => m.codigo === codigo);
    
    if (!foundMotorista) {
      return { success: false, error: 'Código de motorista não encontrado' };
    }

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
