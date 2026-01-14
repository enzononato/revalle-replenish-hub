import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, AlertCircle, Loader2, Package, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Motorista, Produto } from '@/types';

interface ProtocoloEncontrado {
  id: string;
  numero: string;
  data: string;
  hora: string;
  status: string;
  tipo_reposicao: string | null;
  causa: string | null;
  codigo_pdv: string | null;
  nota_fiscal: string | null;
  motorista_nome: string;
  motorista_codigo: string | null;
  motorista_whatsapp: string | null;
  motorista_email: string | null;
  motorista_unidade: string | null;
  produtos: unknown;
  observacao_geral: string | null;
  contato_whatsapp: string | null;
  contato_email: string | null;
  cliente_telefone: string | null;
  fotos_protocolo: unknown;
  observacoes_log: unknown;
  mapa: string | null;
}

interface BuscarProtocoloPdvProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProtocolo: (protocolo: ProtocoloEncontrado) => void;
  motorista: Motorista;
}

export function BuscarProtocoloPdv({ isOpen, onClose, onSelectProtocolo, motorista }: BuscarProtocoloPdvProps) {
  const [codigoPdv, setCodigoPdv] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [resultados, setResultados] = useState<ProtocoloEncontrado[]>([]);
  const [buscaRealizada, setBuscaRealizada] = useState(false);

  const handleBuscar = async () => {
    if (!codigoPdv.trim()) return;
    
    setIsSearching(true);
    setBuscaRealizada(true);
    
    try {
      const { data, error } = await supabase
        .from('protocolos')
        .select('id, numero, data, hora, status, tipo_reposicao, causa, codigo_pdv, nota_fiscal, motorista_nome, motorista_codigo, motorista_whatsapp, motorista_email, motorista_unidade, produtos, observacao_geral, contato_whatsapp, contato_email, cliente_telefone, fotos_protocolo, observacoes_log, mapa')
        .eq('status', 'em_andamento')
        .ilike('codigo_pdv', `%${codigoPdv.trim()}%`)
        .or('oculto.is.null,oculto.eq.false')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      setResultados((data || []) as ProtocoloEncontrado[]);
    } catch (err) {
      console.error('Erro ao buscar protocolos:', err);
      setResultados([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBuscar();
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (!isNaN(date.getTime())) {
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleSelectProtocolo = (protocolo: ProtocoloEncontrado) => {
    onSelectProtocolo(protocolo);
    handleClose();
  };

  const handleClose = () => {
    setCodigoPdv('');
    setResultados([]);
    setBuscaRealizada(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Buscar Reposição por PDV
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Código do PDV"
            value={codigoPdv}
            onChange={(e) => setCodigoPdv(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            autoFocus
          />
          <Button onClick={handleBuscar} disabled={isSearching || !codigoPdv.trim()}>
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mt-2">
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {!isSearching && buscaRealizada && resultados.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum protocolo em atendimento encontrado</p>
              <p className="text-xs mt-1">para o PDV "{codigoPdv}"</p>
            </div>
          )}

          {!isSearching && resultados.map((protocolo) => {
            const produtos = Array.isArray(protocolo.produtos) ? protocolo.produtos as Produto[] : [];
            
            return (
              <Card 
                key={protocolo.id} 
                className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                onClick={() => handleSelectProtocolo(protocolo)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-mono text-sm font-medium truncate">
                          {protocolo.numero}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>PDV: <span className="font-medium text-foreground">{protocolo.codigo_pdv}</span></p>
                        <p>{formatDate(protocolo.data)} às {protocolo.hora}</p>
                        <p>Motorista: {protocolo.motorista_nome}</p>
                        {protocolo.tipo_reposicao && (
                          <p className="capitalize">{protocolo.tipo_reposicao.toLowerCase()}</p>
                        )}
                      </div>
                      {protocolo.observacao_geral && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <div className="flex items-start gap-1 text-xs">
                            <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-foreground line-clamp-3">{protocolo.observacao_geral}</p>
                          </div>
                        </div>
                      )}
                      {produtos.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Package className="w-3 h-3" />
                            <span className="font-medium">{produtos.length} produto{produtos.length > 1 ? 's' : ''}:</span>
                          </div>
                          <ul className="text-xs text-foreground space-y-0.5 ml-4">
                            {produtos.slice(0, 5).map((produto, idx) => (
                              <li key={idx} className="truncate">
                                • {produto.nome} {produto.quantidade && `(${produto.quantidade} ${produto.unidade || 'un'})`}
                              </li>
                            ))}
                            {produtos.length > 5 && (
                              <li className="text-muted-foreground italic">
                                ... e mais {produtos.length - 5} produto{produtos.length - 5 > 1 ? 's' : ''}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] shrink-0">
                      Em Atendimento
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="pt-2 border-t">
          <Button variant="outline" onClick={handleClose} className="w-full">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
