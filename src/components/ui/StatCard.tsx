import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'primary';
  delay?: number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  href?: string;
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
  success: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/40 dark:shadow-none',
  warning: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/40 dark:shadow-none',
  info: 'bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-lg shadow-sky-500/40 dark:shadow-none',
  primary: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/40 dark:shadow-none',
};

const accentBarStyles = {
  default: 'bg-muted-foreground/30',
  success: 'bg-gradient-to-b from-emerald-400 to-emerald-600',
  warning: 'bg-gradient-to-b from-amber-400 to-orange-500',
  info: 'bg-gradient-to-b from-sky-400 to-blue-500',
  primary: 'bg-gradient-to-b from-blue-500 to-indigo-600',
};

const trendStyles = {
  up: 'text-emerald-600 bg-emerald-500/10',
  down: 'text-red-500 bg-red-500/10',
  neutral: 'text-muted-foreground bg-muted',
};

const TrendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'default', 
  delay = 0,
  trend,
  trendValue,
  href
}: StatCardProps) {
  const content = (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 p-4 transition-all duration-300 animate-slide-up",
        "hover:shadow-xl dark:hover:shadow-md hover:-translate-y-1",
        href && "cursor-pointer",
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
          <p className="text-xs font-medium text-muted-foreground mb-0.5">{title}</p>
          <p className="text-2xl font-heading font-bold text-foreground">{value}</p>
          
          {/* Trend indicator */}
          {trend && trendValue && (
            <div className={cn(
              "flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold w-fit",
              trendStyles[trend]
            )}>
              {(() => {
                const IconComponent = TrendIcon[trend];
                return <IconComponent size={11} />;
              })()}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-2.5 rounded-xl transition-all duration-300",
          "group-hover:scale-110 group-hover:rotate-3",
          iconStyles[variant]
        )}>
          <Icon size={22} className="drop-shadow-sm" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}
