import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useProdutosBusca, ProdutoCatalogo } from '@/hooks/useProdutosBusca';
import { cn } from '@/lib/utils';
import { Search, Loader2, X, CheckCircle2 } from 'lucide-react';

interface ProdutoAutocompleteProps {
  value: string;
  onChange: (value: string, embalagem?: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export function ProdutoAutocomplete({
  value,
  onChange,
  onBlur,
  placeholder = "Digite o código ou nome do produto",
  className
}: ProdutoAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isSelected, setIsSelected] = useState(!!value);
  const { produtos, isLoading } = useProdutosBusca(searchTerm);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
    setIsSelected(!!value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If not selected from list, revert to last valid value or clear
        if (!isSelected) {
          setInputValue(value);
          setSearchTerm('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSelected, value]);

  const handleSelect = (produto: ProdutoCatalogo) => {
    const displayValue = `${produto.cod} - ${produto.produto}`;
    setInputValue(displayValue);
    setSearchTerm('');
    setIsSelected(true);
    onChange(displayValue, produto.embalagem);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSearchTerm(newValue);
    setIsSelected(false);
    // Don't call onChange until a product is selected
    if (newValue === '') {
      onChange('');
      setIsSelected(false);
    }
    setIsOpen(newValue.length >= 2);
  };

  const handleClear = () => {
    setInputValue('');
    setSearchTerm('');
    setIsSelected(false);
    onChange('');
  };

  return (
    <div ref={wrapperRef} className="relative">
       <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (isSelected) return;
            if (inputValue.length >= 2) setIsOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => onBlur?.(), 150);
          }}
          placeholder={placeholder}
          className={cn(
            "h-11 text-base pr-16 placeholder:text-muted-foreground/50",
            isSelected && "border-green-500/50 bg-green-50/30 dark:bg-green-950/20",
            className
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isSelected && inputValue && (
            <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          )}
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          ) : isSelected ? (
            <CheckCircle2 size={18} className="text-green-500" />
          ) : (
            <Search size={18} className="text-muted-foreground" />
          )}
        </div>
      </div>
      
      {isOpen && produtos.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {produtos.map((produto) => (
            <button
              key={produto.cod}
              type="button"
              onClick={() => handleSelect(produto)}
              className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors border-b border-border last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-foreground">
                  {produto.cod} - {produto.produto}
                </span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {produto.embalagem}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isOpen && inputValue.length >= 2 && !isLoading && produtos.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum produto encontrado
          </p>
        </div>
      )}
    </div>
  );
}
