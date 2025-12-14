import { cn } from '@/lib/utils';
import { AlertTriangle, Clock } from 'lucide-react';

interface AlertItem {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'critico' | 'atencao';
}

interface AlertCardProps {
  items: AlertItem[];
  className?: string;
  delay?: number;
}

export function AlertCard({ items, className, delay = 0 }: AlertCardProps) {
  if (items.length === 0) {
    return (
      <div 
        className={cn('card-stats animate-slide-up', className)}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <AlertTriangle size={20} className="text-emerald-500" />
          </div>
          <h3 className="font-heading text-lg font-semibold">Alertas</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <div className="p-3 rounded-full bg-emerald-500/10 mb-3">
            <Clock size={24} className="text-emerald-500" />
          </div>
          <p className="text-sm font-medium">Tudo em dia!</p>
          <p className="text-xs">Nenhum alerta no momento</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn('card-stats animate-slide-up', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-500/10">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <h3 className="font-heading text-lg font-semibold">Alertas</h3>
        </div>
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
          {items.length}
        </span>
      </div>
      
      <div className="space-y-3 max-h-[280px] overflow-y-auto">
        {items.map((item) => (
          <div 
            key={item.id}
            className={cn(
              "p-3 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md",
              item.tipo === 'critico' 
                ? "bg-red-500/5 border-red-500" 
                : "bg-amber-500/5 border-amber-500"
            )}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle 
                size={16} 
                className={cn(
                  "mt-0.5 shrink-0",
                  item.tipo === 'critico' ? "text-red-500" : "text-amber-500"
                )} 
              />
              <div className="min-w-0">
                <p className={cn(
                  "text-sm font-semibold truncate",
                  item.tipo === 'critico' ? "text-red-700" : "text-amber-700"
                )}>
                  {item.titulo}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {item.descricao}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
