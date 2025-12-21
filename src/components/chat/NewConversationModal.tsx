import { useState, useEffect } from 'react';
import { Search, MessageSquare, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Mock users fixos
const mockSystemUsers = [
  { id: '1', nome: 'Administrador', nivel: 'admin', unidade: 'Todas' },
  { id: '2', nome: 'Distribuição Juazeiro', nivel: 'distribuicao', unidade: 'Revalle Juazeiro' },
  { id: '3', nome: 'Conferente Juazeiro', nivel: 'conferente', unidade: 'Revalle Juazeiro' },
];

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (user: { id: string; nome: string; nivel: string; unidade: string }) => void;
}

export function NewConversationModal({ open, onOpenChange, onSelectUser }: NewConversationModalProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [motoristas, setMotoristas] = useState<{ id: string; nome: string; nivel: string; unidade: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Buscar usuários (distribuição, conferente, administrador) da mesma unidade
  useEffect(() => {
    const fetchUsuarios = async () => {
      if (!user || !open) return;
      setIsLoading(true);
      
      try {
        let query = supabase
          .from('motoristas')
          .select('id, nome, unidade, funcao')
          .in('funcao', ['distribuicao', 'conferente', 'administrador']);
        
        // Se não for admin (unidade "Todas"), filtrar pela unidade do usuário
        if (user.unidade !== 'Todas') {
          query = query.eq('unidade', user.unidade);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        setMotoristas((data || []).map(m => ({
          id: m.id,
          nome: m.nome,
          nivel: m.funcao || 'distribuicao',
          unidade: m.unidade,
        })));
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsuarios();
  }, [user, open]);

  // Combinar usuários do sistema + motoristas, filtrados por unidade
  const allAvailableUsers = [...mockSystemUsers, ...motoristas]
    .filter(u => u.id !== user?.id)
    .filter(u => {
      // Admin pode ver todos
      if (user?.unidade === 'Todas') return true;
      // Outros só veem da mesma unidade ou admins
      return u.unidade === user?.unidade || u.unidade === 'Todas';
    });

  const filteredUsers = allAvailableUsers.filter(u => 
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.unidade.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadgeColor = (nivel: string) => {
    switch (nivel) {
      case 'admin':
        return 'bg-primary text-primary-foreground';
      case 'distribuicao':
        return 'bg-secondary text-secondary-foreground';
      case 'conferente':
        return 'bg-muted text-muted-foreground';
      case 'motorista':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (nivel: string) => {
    switch (nivel) {
      case 'admin': return 'Admin';
      case 'distribuicao': return 'Distribuição';
      case 'conferente': return 'Conferente';
      case 'motorista': return 'Motorista';
      default: return nivel;
    }
  };

  const handleSelectUser = (selectedUser: typeof allAvailableUsers[0]) => {
    onSelectUser(selectedUser);
    onOpenChange(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Nova Conversa
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {user?.unidade === 'Todas' 
            ? 'Você pode conversar com qualquer usuário.' 
            : `Usuários disponíveis da unidade: ${user?.unidade}`}
        </p>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-64">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando usuários...</p>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 space-y-2">
                <AlertCircle className="h-8 w-8 mx-auto opacity-50" />
                <p>Nenhum usuário encontrado na sua unidade</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className="w-full p-3 rounded-lg text-left hover:bg-accent transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold">
                        {u.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.nome}</span>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", getRoleBadgeColor(u.nivel))}
                        >
                          {getRoleLabel(u.nivel)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{u.unidade}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
