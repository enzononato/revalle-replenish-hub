import { RankingItem } from '@/types';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface RankingCardProps {
  title: string;
  icon: React.ReactNode;
  items: RankingItem[];
  className?: string;
  delay?: number;
  variant?: 'primary' | 'info' | 'success';
}

const progressBarColors = {
  primary: 'bg-gradient-to-r from-blue-500 to-indigo-600',
  info: 'bg-gradient-to-r from-sky-400 to-blue-500',
  success: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
};

const badgeColors = {
  primary: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  info: 'text-sky-600 dark:text-sky-400 bg-sky-500/10',
  success: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
};

export function RankingCard({ 
  title, 
  icon, 
  items, 
  className, 
  delay = 0,
  variant = 'primary'
}: RankingCardProps) {
  const maxValue = Math.max(...items.map(i => i.quantidade), 1);
  
  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return 'text-yellow-500 dark:text-yellow-400';
      case 1:
        return 'text-gray-400 dark:text-gray-300';
      case 2:
        return 'text-amber-600 dark:text-amber-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getMedalBg = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-br from-yellow-400/20 to-amber-500/10 border border-yellow-500/30';
      case 1:
        return 'bg-gradient-to-br from-gray-300/20 to-gray-400/10 border border-gray-400/30';
      case 2:
        return 'bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-600/30';
      default:
        return 'bg-muted/50';
    }
  };

  return (
    <div 
      className={cn('card-stats animate-slide-up', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-heading text-base font-semibold">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => {
          const percentage = (item.quantidade / maxValue) * 100;
          
          return (
            <div 
              key={item.id} 
              className={cn(
                "relative py-2 px-2 rounded-lg transition-all duration-200 hover:bg-muted/30",
                index === 0 && "animate-pulse-subtle"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs',
                    getMedalBg(index),
                    getMedalColor(index)
                  )}>
                    {index < 3 ? (
                      <Trophy size={14} className={getMedalColor(index)} />
                    ) : (
                      `${index + 1}º`
                    )}
                  </span>
                  <span className="text-xs font-medium truncate max-w-[120px]" title={item.nome}>
                    {item.nome}
                  </span>
                </div>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  badgeColors[variant]
                )}>
                  {item.quantidade}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    progressBarColors[variant]
                  )}
                  style={{ 
                    width: `${percentage}%`,
                    animationDelay: `${delay + (index * 100)}ms`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
