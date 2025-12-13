import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Link } from 'react-router-dom';

export function NotificationBell() {
  const { protocolos } = useProtocolos();
  const [isOpen, setIsOpen] = useState(false);

  // Get recent open protocols (last 5)
  const recentProtocolos = protocolos
    .filter(p => p.status === 'aberto')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const count = recentProtocolos.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative p-2.5 rounded-xl transition-all duration-300",
            "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
            "shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40",
            "hover:scale-110 hover:-rotate-12",
            count > 0 && "animate-wiggle"
          )}
        >
          <Bell size={22} className="drop-shadow-sm" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-destructive text-destructive-foreground rounded-full shadow-md">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 bg-popover border-border shadow-xl" 
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-amber-500" />
            <span className="font-semibold text-foreground">Notificações</span>
          </div>
          {count > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-600 rounded-full">
              {count} aberto{count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {recentProtocolos.length > 0 ? (
            recentProtocolos.map((protocolo) => (
              <div
                key={protocolo.id}
                className="px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      #{protocolo.numero}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {protocolo.tipoReposicao || 'Protocolo'} • {protocolo.motorista.nome}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(protocolo.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <StatusBadge status={protocolo.status} />
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Bell size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum protocolo aberto</p>
            </div>
          )}
        </div>
        
        <Link
          to="/protocolos"
          onClick={() => setIsOpen(false)}
          className="block px-4 py-3 text-center text-sm font-medium text-primary hover:bg-muted/50 transition-colors border-t border-border"
        >
          Ver todos os protocolos →
        </Link>
      </PopoverContent>
    </Popover>
  );
}
