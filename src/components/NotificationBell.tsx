import { Bell, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Link } from 'react-router-dom';

const calcularSlaDias = (createdAt: string): number => {
  const dataProtocolo = parseISO(createdAt);
  const hoje = new Date();
  return differenceInDays(hoje, dataProtocolo);
};

export function NotificationBell() {
  const { protocolos } = useProtocolos();
  const [isOpen, setIsOpen] = useState(false);

  // Get recent open protocols (last 5)
  const recentProtocolos = protocolos
    .filter(p => p.status === 'aberto' && !p.oculto)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Count critical SLA protocols (>15 days)
  const criticalCount = protocolos.filter(p => 
    !p.oculto && p.status !== 'encerrado' && calcularSlaDias(p.createdAt) >= 15
  ).length;

  const count = recentProtocolos.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative p-2.5 rounded-xl transition-all duration-300",
            criticalCount > 0 
              ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40"
              : "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40",
            "hover:scale-110 hover:-rotate-12",
            count > 0 && "animate-wiggle"
          )}
        >
          {criticalCount > 0 ? (
            <AlertTriangle size={22} className="drop-shadow-sm" />
          ) : (
            <Bell size={22} className="drop-shadow-sm" />
          )}
          {count > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full shadow-md",
              criticalCount > 0 ? "bg-white text-red-600" : "bg-destructive text-destructive-foreground"
            )}>
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
            {criticalCount > 0 ? (
              <AlertTriangle size={18} className="text-red-500" />
            ) : (
              <Bell size={18} className="text-amber-500" />
            )}
            <span className="font-semibold text-foreground">Notificações</span>
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-600 rounded-full flex items-center gap-1">
                <AlertTriangle size={10} />
                {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}
              </span>
            )}
            {count > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-600 rounded-full">
                {count} aberto{count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        
        {/* Critical SLA Warning */}
        {criticalCount > 0 && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">
                {criticalCount} protocolo{criticalCount !== 1 ? 's' : ''} com SLA crítico (&gt;15 dias)
              </span>
            </div>
          </div>
        )}
        
        <div className="max-h-[300px] overflow-y-auto">
          {recentProtocolos.length > 0 ? (
            recentProtocolos.map((protocolo) => {
              const slaDias = calcularSlaDias(protocolo.createdAt);
              const isCritical = slaDias >= 15;
              
              return (
                <div
                  key={protocolo.id}
                  className={cn(
                    "px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer",
                    isCritical && "bg-red-50/50 dark:bg-red-950/20 border-l-4 border-l-red-500"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm truncate">
                          #{protocolo.numero}
                        </p>
                        {isCritical && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded">
                            CRÍTICO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {protocolo.tipoReposicao || 'Protocolo'} • {protocolo.motorista.nome}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground/70">
                          {formatDistanceToNow(new Date(protocolo.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                        <span className={cn(
                          "px-1.5 py-0.5 text-[10px] font-medium rounded",
                          slaDias >= 15 ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" :
                          slaDias > 7 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300" :
                          "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                        )}>
                          {slaDias} dia{slaDias !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={protocolo.status} />
                  </div>
                </div>
              );
            })
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