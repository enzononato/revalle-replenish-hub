import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { useAuditLog } from '@/hooks/useAuditLog';
import { classifyAuthError, friendlyMessage, withRetry } from '@/lib/authErrorHandling';

const AUTH_USER_CACHE_KEY = 'auth_user_cache_v1';
const APP_ROLES: UserRole[] = ['admin', 'distribuicao', 'conferente', 'controle'];

const isValidRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && APP_ROLES.includes(value as UserRole);

const readCachedUser = (): AppUser | null => {
  try {
    const cached = localStorage.getItem(AUTH_USER_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (parsed && typeof parsed === 'object' && parsed.id && parsed.email && isValidRole(parsed.nivel)) {
      return parsed as AppUser;
    }
    return null;
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

const buildFallbackUser = (authUser: User, cachedUser?: AppUser | null, roleOverride?: UserRole): AppUser => {
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

const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 5000): Promise<T> => {
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

  // Flag to skip onAuthStateChange profile fetch when login already handled it
  const skipNextAuthEvent = useRef(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user));
      return;
    }
    localStorage.removeItem(AUTH_USER_CACHE_KEY);
  }, [user]);

  // Fetch role from user_roles table (no retry — single fast attempt)
  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole | null> => {
    try {
      const { data, error } = await withTimeout(
        Promise.resolve(supabase.rpc('get_user_role', { _user_id: userId })),
        2500,
      );
      if (error) throw error;
      return isValidRole(data) ? data : null;
    } catch (error) {
      console.warn('Falha ao buscar role em user_roles:', error);
      return null;
    }
  }, []);

  // Fetch user profile — single attempt, no retry, tight timeout
  const fetchUserProfile = useCallback(async (authUser: User): Promise<AppUser> => {
    const cachedUser = readCachedUser();

    try {
      const [profileResult, roleResult] = await Promise.allSettled([
        withTimeout(
          Promise.resolve(
            supabase
              .from('user_profiles')
              .select('id, nome, user_email, nivel, unidade')
              .eq('user_email', authUser.email!)
              .maybeSingle()
          ),
          2500,
        ),
        fetchUserRole(authUser.id),
      ]);

      const profileResponse = profileResult.status === 'fulfilled' ? profileResult.value : null;
      const profile = profileResponse?.data ?? null;
      const roleFromTable = roleResult.status === 'fulfilled' ? roleResult.value : null;

      if (profileResult.status === 'rejected') {
        console.warn('Erro ao buscar perfil, aplicando fallback parcial:', profileResult.reason);
      }
      if (profileResponse?.error) {
        console.warn('Erro DB ao buscar perfil:', profileResponse.error.message);
      }

      const roleFromProfile = profile && isValidRole(profile.nivel) ? (profile.nivel as UserRole) : null;
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

  // Initialization
  useEffect(() => {
    let isMounted = true;

    // 1. Instantly show cached user to eliminate loading flash
    const cachedUser = readCachedUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);

      // Skip if login() already handled this
      if (skipNextAuthEvent.current) {
        skipNextAuthEvent.current = false;
        return;
      }

      // During INITIAL_SESSION, let initializeSession handle it
      if (event === 'INITIAL_SESSION') return;

      if (newSession?.user) {
        fetchUserProfile(newSession.user)
          .then(profile => {
            if (isMounted) setUser(profile);
          })
          .catch((err) => {
            console.warn('Erro ao hidratar perfil no evento auth:', err);
            if (isMounted) setUser(buildFallbackUser(newSession.user));
          })
          .finally(() => {
            if (isMounted) setIsLoading(false);
          });
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    const initializeSession = async () => {
      try {
        const result = await withTimeout(
          supabase.auth.getSession(),
          5000,
        );
        const existingSession = result.data?.session ?? null;
        const sessionError = result.error;
        if (!isMounted) return;

        if (sessionError) {
          console.warn('Sessão inválida, limpando:', sessionError.message);
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          return;
        }

        setSession(existingSession);

        if (existingSession?.user) {
          // If we have a valid cache for this user, show it immediately and refresh in background
          if (cachedUser && cachedUser.email === existingSession.user.email) {
            setUser(cachedUser);
            setIsLoading(false);

            // Background refresh — update silently
            fetchUserProfile(existingSession.user)
              .then(freshProfile => {
                if (isMounted) setUser(freshProfile);
              })
              .catch(() => { /* cache is already showing, ignore */ });
          } else {
            // No valid cache — fetch then show
            const profile = await fetchUserProfile(existingSession.user);
            if (isMounted) setUser(profile);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Erro ao inicializar sessão:', err);
        if (isMounted) {
          // If we had a cached user but getSession timed out, still try to show something
          // but mark as not authenticated since session is unknown
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
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
      const { data } = await withRetry(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return { data };
      });

      if (data.user) {
        // Tell onAuthStateChange to skip its fetch — we handle it here
        skipNextAuthEvent.current = true;

        const profile = await fetchUserProfile(data.user);
        setUser(profile);
        setSession(data.session);

        // Non-blocking audit log
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
