import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { useAuditLog } from '@/hooks/useAuditLog';

const AUTH_CACHE_KEY = 'auth_user_cache_v1';

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
  isControle: boolean;
  canValidate: boolean;
  canLaunch: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Retry helper for transient DB errors
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 1000): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw new Error('withRetry exhausted');
}

function cacheUser(user: AppUser) {
  try { localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user)); } catch {}
}

function getCachedUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearCachedUser() {
  try { localStorage.removeItem(AUTH_CACHE_KEY); } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { registrarLog } = useAuditLog();

  // Buscar perfil do usuário no banco com retry
  const fetchUserProfile = useCallback(async (authUser: User): Promise<AppUser | null> => {
    try {
      const profile = await withRetry(async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_email', authUser.email)
          .maybeSingle();
        if (error) throw error;
        return data;
      });

      if (!profile) {
        console.warn('Perfil não encontrado para:', authUser.email);
        // Tentar cache como fallback
        const cached = getCachedUser();
        if (cached && cached.email === authUser.email) return cached;
        return null;
      }

      const appUser: AppUser = {
        id: profile.id,
        nome: profile.nome || authUser.email || '',
        email: profile.user_email,
        nivel: (profile.nivel as UserRole) || 'conferente',
        unidade: profile.unidade || '',
      };
      cacheUser(appUser);
      return appUser;
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      // Fallback para cache em caso de erro de conexão
      const cached = getCachedUser();
      if (cached && cached.email === authUser.email) {
        console.log('Usando perfil do cache local');
        return cached;
      }
      return null;
    }
  }, []);

  // Limpar cache stale na montagem para forçar busca fresca
  useEffect(() => {
    clearCachedUser();
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
    clearCachedUser();
  }, [user, registrarLog]);

  const isAdmin = user?.nivel === 'admin';
  const isDistribuicao = user?.nivel === 'distribuicao';
  const isConferente = user?.nivel === 'conferente';
  const isControle = user?.nivel === 'controle';

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
