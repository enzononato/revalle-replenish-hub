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

  const allSelected = selected.length === 0 || selected.length === unidades.length;

  const handleToggleAll = () => {
    if (allSelected) {
      // Se todas estão selecionadas, não faz nada (ou limpa)
      // Vazio = todas, então se clicar em "Todas" quando já está tudo, mantém
      onChange([]);
    } else {
      onChange([]);
    }
  };

  const handleToggle = (nome: string) => {
    if (selected.length === 0) {
      // Estava "todas" → selecionar apenas as outras (desmarcar esta)
      const allExcept = unidades.map(u => u.nome).filter(n => n !== nome);
      onChange(allExcept);
    } else if (selected.includes(nome)) {
      const newSelected = selected.filter(s => s !== nome);
      // Se removeu a última, volta para "todas"
      if (newSelected.length === 0) {
        onChange([]);
      } else {
        onChange(newSelected);
      }
    } else {
      const newSelected = [...selected, nome];
      // Se selecionou todas, volta para array vazio (= todas)
      if (newSelected.length === unidades.length) {
        onChange([]);
      } else {
        onChange(newSelected);
      }
    }
  };

  const isChecked = (nome: string) => {
    return selected.length === 0 || selected.includes(nome);
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
              checked={allSelected}
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
