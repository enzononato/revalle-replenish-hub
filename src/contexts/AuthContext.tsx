import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { useAuditLog } from '@/hooks/useAuditLog';

interface AppUser {
  id: string;
  nome: string;
  email: string;
  nivel: UserRole;
  unidade: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isDistribuicao: boolean;
  isConferente: boolean;
  canValidate: boolean;
  canLaunch: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { registrarLog } = useAuditLog();

  // Buscar perfil do usuário no banco
  const fetchUserProfile = useCallback(async (authUser: User): Promise<AppUser | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_email', authUser.email)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return null;
      }

      if (!profile) {
        console.warn('Perfil não encontrado para:', authUser.email);
        return null;
      }

      return {
        id: profile.id,
        nome: profile.nome || authUser.email || '',
        email: profile.user_email,
        nivel: (profile.nivel as UserRole) || 'conferente',
        unidade: profile.unidade || '',
      };
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      return null;
    }
  }, []);

  // Inicialização - verificar sessão existente
  useEffect(() => {
    // Configurar listener de mudanças de auth PRIMEIRO
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      
      if (newSession?.user) {
        // Usar setTimeout para evitar deadlock
        setTimeout(() => {
          fetchUserProfile(newSession.user).then(profile => {
            setUser(profile);
            setIsLoading(false);
          });
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // DEPOIS verificar sessão existente
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      
      if (existingSession?.user) {
        fetchUserProfile(existingSession.user).then(profile => {
          setUser(profile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Erro no login:', error.message);
        return false;
      }

      if (data.user) {
        const profile = await fetchUserProfile(data.user);
        
        if (profile) {
          setUser(profile);
          
          // Registrar log de login
          await registrarLog({
            acao: 'login',
            tabela: 'sessao',
            registro_id: profile.id,
            registro_dados: { email: profile.email },
            usuario_nome: profile.nome,
            usuario_role: profile.nivel,
            usuario_unidade: profile.unidade,
          });
        }
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Erro no login:', err);
      return false;
    }
  }, [fetchUserProfile, registrarLog]);

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
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [user, registrarLog]);

  const isAdmin = user?.nivel === 'admin';
  const isDistribuicao = user?.nivel === 'distribuicao';
  const isConferente = user?.nivel === 'conferente';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated: !!user && !!session,
      isLoading,
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
