import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { usePdvsBusca, PdvCatalogo } from '@/hooks/usePdvsBusca';
import { Loader2, MapPin, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdvAutocompleteProps {
  value: string;
  onChange: (value: string, pdv?: PdvCatalogo) => void;
  unidade: string;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
}

export function PdvAutocomplete({
  value,
  onChange,
  unidade,
  placeholder = 'Digite código ou nome do PDV...',
  className,
  onBlur
}: PdvAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPdv, setSelectedPdv] = useState<PdvCatalogo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { pdvs, isLoading } = usePdvsBusca(inputValue, unidade);

  // Sincronizar com valor externo
  useEffect(() => {
    if (value !== inputValue && !selectedPdv) {
      setInputValue(value);
    }
  }, [value]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedPdv(null);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectPdv = (pdv: PdvCatalogo) => {
    const displayValue = `${pdv.codigo} - ${pdv.nome}`;
    setInputValue(displayValue);
    setSelectedPdv(pdv);
    onChange(pdv.codigo, pdv);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    setSelectedPdv(null);
    onChange('');
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    setTimeout(() => {
      onBlur?.();
    }, 200);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn('pl-9 pr-10', className)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {inputValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {isOpen && pdvs.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {pdvs.map((pdv) => (
            <button
              key={`${pdv.codigo}-${pdv.nome}`}
              type="button"
              onClick={() => handleSelectPdv(pdv)}
              className="w-full px-3 py-3 text-left hover:bg-accent transition-colors flex items-start gap-2 border-b border-border last:border-b-0"
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {pdv.codigo} - {pdv.nome}
                </div>
                {(pdv.bairro || pdv.cidade) && (
                  <div className="text-xs text-muted-foreground truncate">
                    {[pdv.bairro, pdv.cidade].filter(Boolean).join(' • ')}
                  </div>
                )}
                {pdv.endereco && (
                  <div className="text-xs text-muted-foreground truncate">
                    {pdv.endereco}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && inputValue.length >= 2 && pdvs.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-3 text-center text-sm text-muted-foreground">
          Nenhum PDV encontrado para "{inputValue}"
        </div>
      )}
    </div>
  );
}
