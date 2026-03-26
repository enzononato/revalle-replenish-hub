import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { useAuditLog } from '@/hooks/useAuditLog';
import { classifyAuthError, friendlyMessage, withRetry } from '@/lib/authErrorHandling';

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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isDistribuicao: boolean;
  isConferente: boolean;
  isControle: boolean;
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

  // Inicialização - verificar sessão existente sem flicker/redirect indevido
  useEffect(() => {
    let isMounted = true;
    let isInitializing = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);

      // Durante bootstrap, quem decide estado final é getSession()
      if (isInitializing && event === 'INITIAL_SESSION') return;

      if (newSession?.user) {
        setTimeout(() => {
          fetchUserProfile(newSession.user).then(profile => {
            if (!isMounted) return;
            setUser(profile);
            setIsLoading(false);
          });
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    const initializeSession = async () => {
      try {
        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
        if (!isMounted) return;

        // Se houve erro ao restaurar sessão (token inválido/expirado), limpar tudo
        if (sessionError) {
          console.warn('Sessão inválida, limpando:', sessionError.message);
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          return;
        }

        setSession(existingSession);

        if (existingSession?.user) {
          const profile = await fetchUserProfile(existingSession.user);
          if (!isMounted) return;
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Erro ao inicializar sessão:', err);
        // Em caso de erro inesperado, garantir que não fique travado
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
        isInitializing = false;
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await withRetry(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
      });

      if (result.user) {
        const profile = await fetchUserProfile(result.user);
        if (profile) {
          setUser(profile);
          void registrarLog({
            acao: 'login',
            tabela: 'sessao',
            registro_id: profile.id,
            registro_dados: { email: profile.email },
            usuario_nome: profile.nome,
            usuario_role: profile.nivel,
            usuario_unidade: profile.unidade,
          });
        }
        return { success: true };
      }
      return { success: false, error: 'Resposta inesperada do servidor' };
    } catch (err) {
      const classified = classifyAuthError(err);
      console.error(`[AUTH:admin] Login failed (${classified.type}):`, classified.message);
      return { success: false, error: friendlyMessage(classified) };
    }
  }, [fetchUserProfile, registrarLog]);

  const logout = useCallback(async () => {
    if (user) {
      // Registrar log de logout
      void registrarLog({
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
  const isControle = user?.nivel === 'controle';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated: !!session,
      isLoading,
      login,
      logout,
      isAdmin,
      isDistribuicao,
      isConferente,
      isControle,
      canValidate: isAdmin || isConferente || isControle,
      canLaunch: isAdmin || isDistribuicao || isControle
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
