import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectUnidadeProps {
  unidades: { id: string; nome: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function MultiSelectUnidade({
  unidades,
  selected,
  onChange,
  placeholder = 'Todas as Unidades',
  className,
  triggerClassName,
}: MultiSelectUnidadeProps) {
  const [open, setOpen] = useState(false);

  const noneSelected = selected.length === 0;
  const allSelected = selected.length === unidades.length;

  const handleToggleAll = () => {
    // Sempre limpa → volta para "Todas"
    onChange([]);
  };

  const handleToggle = (nome: string) => {
    if (selected.includes(nome)) {
      const newSelected = selected.filter(s => s !== nome);
      onChange(newSelected);
    } else {
      const newSelected = [...selected, nome];
      onChange(newSelected);
    }
  };

  const isChecked = (nome: string) => {
    return noneSelected || selected.includes(nome);
  };

  const displayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0];
    return `${selected.length} unidades`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 text-xs bg-background/80 backdrop-blur-sm justify-between font-normal',
            triggerClassName
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Building2 size={14} className="text-muted-foreground shrink-0" />
            <span className="truncate">{displayText()}</span>
          </span>
          <ChevronDown size={14} className="ml-1.5 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-56 p-2 z-50', className)} align="start">
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {/* Selecionar Todas */}
          <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-xs font-medium">
            <Checkbox
              checked={noneSelected || allSelected}
              onCheckedChange={handleToggleAll}
            />
            {placeholder}
          </label>
          
          <div className="h-px bg-border my-1" />

          {unidades.map(u => (
            <label
              key={u.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-xs"
            >
              <Checkbox
                checked={isChecked(u.nome)}
                onCheckedChange={() => handleToggle(u.nome)}
              />
              {u.nome}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
