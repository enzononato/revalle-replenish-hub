import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'primary';
  delay?: number;
}

const variantStyles = {
  default: 'bg-card border-border hover:border-muted-foreground/30',
  success: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-500/50',
  warning: 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30 hover:border-amber-500/50',
  info: 'bg-gradient-to-br from-sky-500/10 to-blue-500/5 border-sky-500/30 hover:border-sky-500/50',
  primary: 'bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/30 hover:border-blue-500/50',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/40',
  warning: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/40',
  info: 'bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-lg shadow-sky-500/40',
  primary: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/40',
};

const accentBarStyles = {
  default: 'bg-muted-foreground/30',
  success: 'bg-gradient-to-b from-emerald-400 to-emerald-600',
  warning: 'bg-gradient-to-b from-amber-400 to-orange-500',
  info: 'bg-gradient-to-b from-sky-400 to-blue-500',
  primary: 'bg-gradient-to-b from-blue-500 to-indigo-600',
};

export function StatCard({ title, value, icon: Icon, variant = 'default', delay = 0 }: StatCardProps) {
  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300 animate-slide-up",
        "hover:shadow-xl hover:-translate-y-1",
        variantStyles[variant]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Accent bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
        accentBarStyles[variant]
      )} />
      
      <div className="flex items-start justify-between">
        <div className="pl-2">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-heading font-bold text-foreground">{value}</p>
        </div>
        <div className={cn(
          "p-3 rounded-xl transition-all duration-300",
          "group-hover:scale-110 group-hover:rotate-3",
          iconStyles[variant]
        )}>
          <Icon size={28} className="drop-shadow-sm" />
        </div>
      </div>
    </div>
  );
}
