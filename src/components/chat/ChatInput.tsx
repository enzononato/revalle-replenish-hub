import { useState } from 'react';
import { Send, FileText, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProtocolos } from '@/contexts/ProtocolosContext';

interface ChatInputProps {
  onSend: (content: string, protocoloId?: string, protocoloNumero?: string) => void;
  isSending: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isSending, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [selectedProtocolo, setSelectedProtocolo] = useState<{ id: string; numero: string } | null>(null);
  const [protocoloSearch, setProtocoloSearch] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { protocolos } = useProtocolos();

  const filteredProtocolos = protocolos
    .filter(p => p.numero.toLowerCase().includes(protocoloSearch.toLowerCase()))
    .slice(0, 10);

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message.trim(), selectedProtocolo?.id, selectedProtocolo?.numero);
    setMessage('');
    setSelectedProtocolo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-border bg-card">
      {selectedProtocolo && (
        <div className="mb-2">
          <Badge variant="secondary" className="gap-1 pr-1">
            <FileText className="h-3 w-3" />
            {selectedProtocolo.numero}
            <button
              onClick={() => setSelectedProtocolo(null)}
              className="ml-1 hover:bg-muted rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0"
              disabled={disabled}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b border-border">
              <Input
                placeholder="Buscar protocolo..."
                value={protocoloSearch}
                onChange={(e) => setProtocoloSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="h-64">
              {filteredProtocolos.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground text-center">
                  Nenhum protocolo encontrado
                </p>
              ) : (
                <div className="p-2">
                  {filteredProtocolos.map((protocolo) => (
                    <button
                      key={protocolo.id}
                      onClick={() => {
                        setSelectedProtocolo({ id: protocolo.id, numero: protocolo.numero });
                        setIsPopoverOpen(false);
                        setProtocoloSearch('');
                      }}
                      className="w-full text-left p-2 rounded hover:bg-accent transition-colors"
                    >
                      <div className="font-medium text-sm">{protocolo.numero}</div>
                      <div className="text-xs text-muted-foreground">
                        {protocolo.motorista.nome} • {protocolo.data}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <Input
          placeholder="Digite sua mensagem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSending}
          className="flex-1"
        />

        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending || disabled}
          className="flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
