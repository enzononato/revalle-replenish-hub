import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole } from '@/types';
import { useAuditLog } from '@/hooks/useAuditLog';
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isDistribuicao: boolean;
  isConferente: boolean;
  canValidate: boolean;
  canLaunch: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo - 3 níveis
const mockUsers: (User & { password: string })[] = [
  {
    id: '1',
    nome: 'Administrador',
    email: 'admin@revalle.com',
    nivel: 'admin',
    unidade: 'Todas',
    password: 'admin123'
  },
  {
    id: '2',
    nome: 'Distribuição Juazeiro',
    email: 'distribuicao@revalle.com',
    nivel: 'distribuicao',
    unidade: 'Revalle Juazeiro',
    password: 'dist123'
  },
  {
    id: '3',
    nome: 'Conferente Juazeiro',
    email: 'conferente@revalle.com',
    nivel: 'conferente',
    unidade: 'Revalle Juazeiro',
    password: 'conf123'
  }
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('revalle_user');
    return saved ? JSON.parse(saved) : null;
  });
  const { registrarLog } = useAuditLog();

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const { password: _, ...userData } = foundUser;
      setUser(userData);
      localStorage.setItem('revalle_user', JSON.stringify(userData));
      
      // Registrar log de login
      await registrarLog({
        acao: 'login',
        tabela: 'sessao',
        registro_id: userData.id,
        registro_dados: { email: userData.email },
        usuario_nome: userData.nome,
        usuario_role: userData.nivel,
        usuario_unidade: userData.unidade,
      });
      
      return true;
    }
    return false;
  }, [registrarLog]);

  const logout = useCallback(async () => {
    if (user) {
      // Registrar log de logout
      await registrarLog({
        acao: 'logout',
        tabela: 'sessao',
        registro_id: user.id,
        registro_dados: { email: user.email },
        usuario_nome: user.nome,
        usuario_role: user.nivel,
        usuario_unidade: user.unidade,
      });
    }
    setUser(null);
    localStorage.removeItem('revalle_user');
  }, [user, registrarLog]);

  const isAdmin = user?.nivel === 'admin';
  const isDistribuicao = user?.nivel === 'distribuicao';
  const isConferente = user?.nivel === 'conferente';

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      isAdmin,
      isDistribuicao,
      isConferente,
      canValidate: isAdmin || isConferente,
      canLaunch: isAdmin || isDistribuicao
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
