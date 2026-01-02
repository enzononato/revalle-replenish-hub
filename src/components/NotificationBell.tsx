import { Bell, AlertTriangle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow, differenceInDays, parse, parseISO, format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Link } from 'react-router-dom';

const DISMISSED_KEY = 'critical_sla_dismissed_date';
const DISMISSED_NOTIFICATIONS_KEY = 'dismissed_notifications';

const calcularSlaDias = (dataStr: string): number => {
  try {
    const dataProtocolo = parse(dataStr, 'dd/MM/yyyy', new Date());
    const hoje = new Date();
    return differenceInDays(hoje, dataProtocolo);
  } catch {
    return 0;
  }
};

interface DismissedNotification {
  id: string;
  dismissedAt: string;
}

export function NotificationBell() {
  const { protocolos } = useProtocolos();
  const { user, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissedToday, setIsDismissedToday] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<DismissedNotification[]>([]);

  // Filter protocols by user's unit (admin sees all)
  const protocolosFiltrados = isAdmin 
    ? protocolos 
    : protocolos.filter(p => p.motorista.unidade === user?.unidade);

  // Check if critical notification was dismissed today
  useEffect(() => {
    const dismissedDate = localStorage.getItem(DISMISSED_KEY);
    if (dismissedDate) {
      try {
        const date = parseISO(dismissedDate);
        setIsDismissedToday(isToday(date));
      } catch {
        setIsDismissedToday(false);
      }
    }

    // Load dismissed individual notifications
    const savedDismissed = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    if (savedDismissed) {
      try {
        const dismissed: DismissedNotification[] = JSON.parse(savedDismissed);
        // Filter out old dismissed notifications (keep only today's)
        const todayDismissed = dismissed.filter(d => {
          try {
            return isToday(parseISO(d.dismissedAt));
          } catch {
            return false;
          }
        });
        setDismissedNotifications(todayDismissed);
        localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(todayDismissed));
      } catch {
        setDismissedNotifications([]);
      }
    }
  }, []);

  // Get recent open protocols (last 5), excluding dismissed ones
  const recentProtocolos = protocolosFiltrados
    .filter(p => p.status === 'aberto' && !p.oculto && !dismissedNotifications.some(d => d.id === p.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Count critical SLA protocols (>15 days)
  const criticalCount = protocolosFiltrados.filter(p => 
    !p.oculto && p.status !== 'encerrado' && calcularSlaDias(p.data) >= 15
  ).length;

  // Show critical only if not dismissed today
  const showCritical = criticalCount > 0 && !isDismissedToday;

  const handleDismissCritical = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
    setIsDismissedToday(true);
  };

  const handleDismissNotification = (e: React.MouseEvent, protocoloId: string) => {
    e.stopPropagation();
    const newDismissed: DismissedNotification = {
      id: protocoloId,
      dismissedAt: new Date().toISOString()
    };
    const updated = [...dismissedNotifications, newDismissed];
    setDismissedNotifications(updated);
    localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(updated));
  };

  const count = recentProtocolos.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative p-2.5 rounded-xl transition-all duration-300",
            showCritical 
              ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40"
              : "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40",
            "hover:scale-110 hover:-rotate-12",
            count > 0 && !isOpen && "animate-wiggle"
          )}
        >
          {showCritical ? (
            <AlertTriangle size={22} className="drop-shadow-sm" />
          ) : (
            <Bell size={22} className="drop-shadow-sm" />
          )}
          {count > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full shadow-md",
              showCritical ? "bg-white text-red-600" : "bg-destructive text-destructive-foreground"
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
            {showCritical ? (
              <AlertTriangle size={18} className="text-red-500" />
            ) : (
              <Bell size={18} className="text-amber-500" />
            )}
            <span className="font-semibold text-foreground">Notificações</span>
          </div>
          <div className="flex gap-2">
            {showCritical && (
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
        {showCritical && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle size={16} />
                <span className="text-sm font-medium">
                  {criticalCount} protocolo{criticalCount !== 1 ? 's' : ''} com SLA crítico
                </span>
              </div>
              <button
                onClick={handleDismissCritical}
                className="p-1 rounded-full hover:bg-red-200 dark:hover:bg-red-900 transition-colors text-red-600 dark:text-red-400"
                title="Dispensar até amanhã"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
              Clique no X para dispensar até amanhã
            </p>
          </div>
        )}
        
        <div className="max-h-[300px] overflow-y-auto">
          {recentProtocolos.length > 0 ? (
            recentProtocolos.map((protocolo) => {
              const slaDias = calcularSlaDias(protocolo.data);
              const isCritical = slaDias >= 15;
              
              return (
                <div
                  key={protocolo.id}
                  className={cn(
                    "px-4 py-3 border-b-2 border-border hover:bg-muted/50 transition-colors cursor-pointer",
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
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={protocolo.status} />
                      <button
                        onClick={(e) => handleDismissNotification(e, protocolo.id)}
                        className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Dispensar até amanhã"
                      >
                        <X size={14} />
                      </button>
                    </div>
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