import { cn } from '@/lib/utils';

type Status = 'aberto' | 'em_andamento' | 'encerrado';

interface StatusBadgeProps {
  status: Status;
}

const statusConfig = {
  aberto: { label: 'Aberto', className: 'badge-open' },
  em_andamento: { label: 'Em Andamento', className: 'badge-progress' },
  encerrado: { label: 'Encerrado', className: 'badge-closed' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn("badge-status", config.className)}>
      {config.label}
    </span>
  );
}
