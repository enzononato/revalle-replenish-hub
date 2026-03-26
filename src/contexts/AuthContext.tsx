import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { useAuditLog } from '@/hooks/useAuditLog';
import { classifyAuthError, friendlyMessage, withRetry } from '@/lib/authErrorHandling';

const AUTH_USER_CACHE_KEY = 'auth_user_cache_v1';
const APP_ROLES: UserRole[] = ['admin', 'distribuicao', 'conferente', 'controle'];

const isValidRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && APP_ROLES.includes(value as UserRole);

const readCachedUser = (): Partial<AppUser> | null => {
  try {
    const cached = localStorage.getItem(AUTH_USER_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed && typeof parsed === 'object' ? (parsed as Partial<AppUser>) : null;
  } catch {
    return null;
  }
};

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

const buildFallbackUser = (authUser: User, cachedUser?: Partial<AppUser> | null, roleOverride?: UserRole): AppUser => {
  const cachedRole = cachedUser?.email === authUser.email && isValidRole(cachedUser?.nivel)
    ? cachedUser.nivel
    : undefined;

  return {
    id: authUser.id,
    nome: (authUser.user_metadata?.nome as string | undefined) || cachedUser?.nome || authUser.email || 'Usuário',
    email: authUser.email || cachedUser?.email || '',
    nivel: roleOverride || cachedRole || 'conferente',
    unidade: cachedUser?.email === authUser.email ? (cachedUser?.unidade || '') : '',
  };
};

const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 9000): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout ao carregar sessão/perfil'));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

const fallbackAuthContext: AuthContextType = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => ({
    success: false,
    error: 'Sistema de autenticação indisponível. Atualize a página e tente novamente.',
  }),
  logout: async () => {},
  isAdmin: false,
  isDistribuicao: false,
  isConferente: false,
  isControle: false,
  canValidate: false,
  canLaunch: false,
};

let hasWarnedMissingProvider = false;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { registrarLog } = useAuditLog();

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user));
      return;
    }
    localStorage.removeItem(AUTH_USER_CACHE_KEY);
  }, [user]);

  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole | null> => {
    try {
      const roleValue = await withTimeout(
        withRetry(async () => {
          const { data, error } = await supabase.rpc('get_user_role', { _user_id: userId });
          if (error) throw error;
          return data;
        }, 1, 300),
        3500,
      );

      return isValidRole(roleValue) ? roleValue : null;
    } catch (error) {
      console.warn('Falha ao buscar role em user_roles:', error);
      return null;
    }
  }, []);

  // Buscar perfil do usuário no banco
  const fetchUserProfile = useCallback(async (authUser: User): Promise<AppUser> => {
    const cachedUser = readCachedUser();

    try {
      const [profileResult, roleResult] = await Promise.allSettled([
        withTimeout(
          withRetry(async () => {
            const { data, error } = await supabase
              .from('user_profiles')
              .select('id, nome, user_email, nivel, unidade')
              .eq('user_email', authUser.email)
              .maybeSingle();
            if (error) throw error;
            return data;
          }, 1, 300),
          3500,
        ),
        fetchUserRole(authUser.id),
      ]);

      const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
      const roleFromTable = roleResult.status === 'fulfilled' ? roleResult.value : null;

      if (profileResult.status === 'rejected') {
        console.warn('Erro ao buscar perfil, aplicando fallback parcial:', profileResult.reason);
      }

      const roleFromProfile = isValidRole(profile?.nivel) ? (profile.nivel as UserRole) : null;
      const cachedRole = cachedUser?.email === authUser.email && isValidRole(cachedUser?.nivel)
        ? cachedUser.nivel
        : null;

      const resolvedRole = roleFromTable || roleFromProfile || cachedRole || 'conferente';

      if (!profile) {
        return buildFallbackUser(authUser, cachedUser, resolvedRole);
      }

      return {
        id: profile.id,
        nome: profile.nome || authUser.email || cachedUser?.nome || '',
        email: profile.user_email || authUser.email || cachedUser?.email || '',
        nivel: resolvedRole,
        unidade: profile.unidade || (cachedUser?.email === authUser.email ? (cachedUser?.unidade || '') : ''),
      };
    } catch (err) {
      console.warn('Erro ao buscar perfil, aplicando fallback:', err);
      return buildFallbackUser(authUser, cachedUser);
    }
  }, [fetchUserRole]);

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
          fetchUserProfile(newSession.user)
            .then(profile => {
              if (!isMounted) return;
              setUser(profile);
            })
            .catch((err) => {
              console.warn('Erro ao hidratar perfil no evento auth, aplicando fallback:', err);
              if (!isMounted) return;
              setUser(buildFallbackUser(newSession.user));
            })
            .finally(() => {
              if (isMounted) setIsLoading(false);
            });
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    const initializeSession = async () => {
      try {
        const { data: { session: existingSession }, error: sessionError } = await withTimeout(
          supabase.auth.getSession()
        );
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
  if (!context && !hasWarnedMissingProvider) {
    hasWarnedMissingProvider = true;
    console.error('useAuth foi chamado fora do AuthProvider. Aplicando fallback para evitar tela em branco.');
  }
  return context ?? fallbackAuthContext;
}
