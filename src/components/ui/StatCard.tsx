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
  default: 'bg-card border-border',
  success: 'bg-success/10 border-success/30',
  warning: 'bg-warning/10 border-warning/30',
  info: 'bg-info/10 border-info/30',
  primary: 'bg-primary/10 border-primary/30',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  info: 'bg-info text-info-foreground',
  primary: 'bg-primary text-primary-foreground',
};

export function StatCard({ title, value, icon: Icon, variant = 'default', delay = 0 }: StatCardProps) {
  return (
    <div 
      className={cn(
        "card-stats border-2 animate-slide-up",
        variantStyles[variant]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-heading font-bold text-foreground">{value}</p>
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          iconStyles[variant]
        )}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
