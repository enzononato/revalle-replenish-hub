import { RankingItem } from '@/types';
import { cn } from '@/lib/utils';
import { Trophy, Medal } from 'lucide-react';

interface RankingCardProps {
  title: string;
  icon: React.ReactNode;
  items: RankingItem[];
  className?: string;
  delay?: number;
}

export function RankingCard({ title, icon, items, className, delay = 0 }: RankingCardProps) {
  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return 'text-yellow-500';
      case 1:
        return 'text-gray-400';
      case 2:
        return 'text-amber-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div 
      className={cn('card-stats animate-slide-up', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div 
            key={item.id} 
            className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className={cn('font-bold text-lg w-6', getMedalColor(index))}>
                {index < 3 ? (
                  <Trophy size={18} className={getMedalColor(index)} />
                ) : (
                  `${index + 1}º`
                )}
              </span>
              <span className="text-sm font-medium truncate max-w-[150px]" title={item.nome}>
                {item.nome}
              </span>
            </div>
            <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
              {item.quantidade}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
