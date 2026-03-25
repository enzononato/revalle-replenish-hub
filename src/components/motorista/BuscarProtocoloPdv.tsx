import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
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

export interface ProtocoloEncontrado {
  id: string;
  numero: string;
  data: string;
  hora: string;
  status: 'aberto' | 'em_andamento' | 'encerrado';
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
  onSelectProtocolo?: (protocolo: ProtocoloEncontrado) => void;
  motorista: Motorista;
  selectionMode?: 'select' | 'view';
  statusFilter?: 'aberto' | 'em_andamento';
}

export function BuscarProtocoloPdv({
  isOpen,
  onClose,
  onSelectProtocolo,
  motorista,
  selectionMode = 'select',
  statusFilter = 'em_andamento',
}: BuscarProtocoloPdvProps) {
  const [codigoPdv, setCodigoPdv] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [resultados, setResultados] = useState<ProtocoloEncontrado[]>([]);
  const [buscaRealizada, setBuscaRealizada] = useState(false);
  const [protocoloExpandidoId, setProtocoloExpandidoId] = useState<string | null>(null);

  const handleBuscar = async () => {
    if (!codigoPdv.trim()) return;

    setIsSearching(true);
    setBuscaRealizada(true);
    setProtocoloExpandidoId(null);

    try {
      const { data, error } = await supabase
        .from('protocolos')
        .select('id, numero, data, hora, status, tipo_reposicao, causa, codigo_pdv, nota_fiscal, motorista_nome, motorista_codigo, motorista_whatsapp, motorista_email, motorista_unidade, produtos, observacao_geral, contato_whatsapp, contato_email, cliente_telefone, fotos_protocolo, observacoes_log, mapa')
        .eq('status', statusFilter)
        .eq('ativo', true)
        .eq('codigo_pdv', codigoPdv.trim())
        .or('oculto.is.null,oculto.eq.false')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const results = (data || []) as ProtocoloEncontrado[];
      setResultados(results);
      // Auto-expandir se houver apenas 1 resultado
      if (results.length === 1) {
        setProtocoloExpandidoId(results[0].id);
      } else if (results.length > 1) {
        // Expandir todos automaticamente - usar o primeiro como referência
        setProtocoloExpandidoId('__all__');
      }
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
    setProtocoloExpandidoId((current) => current === protocolo.id ? null : protocolo.id);
  };

  const handleConfirmSelect = (e: React.MouseEvent, protocolo: ProtocoloEncontrado) => {
    e.stopPropagation();
    onSelectProtocolo?.(protocolo);
    handleClose();
  };

  const handleClose = () => {
    setCodigoPdv('');
    setResultados([]);
    setBuscaRealizada(false);
    setProtocoloExpandidoId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6 rounded-xl">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="w-5 h-5 text-primary" />
            {selectionMode === 'view' ? 'Consultar Reposição do PDV' : 'Buscar Reposição por PDV'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Código do PDV"
            value={codigoPdv}
            onChange={(e) => setCodigoPdv(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 h-11 text-base"
            autoFocus
          />
          <Button onClick={handleBuscar} disabled={isSearching || !codigoPdv.trim()} className="h-11 w-11 shrink-0">
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mt-2 -mx-1 px-1">
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {!isSearching && buscaRealizada && resultados.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum protocolo {statusFilter === 'aberto' ? 'aberto' : 'em atendimento'} encontrado</p>
              <p className="text-xs mt-1">para o PDV "{codigoPdv}"</p>
            </div>
          )}

          {!isSearching && resultados.map((protocolo) => {
            const produtos = Array.isArray(protocolo.produtos) ? protocolo.produtos as Produto[] : [];
            const isExpanded = protocoloExpandidoId === protocolo.id || protocoloExpandidoId === '__all__';

            return (
              <div
                key={protocolo.id}
                className="rounded-lg border border-border/60 bg-card p-2.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                onClick={() => handleSelectProtocolo(protocolo)}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-mono text-[11px] font-bold truncate">
                      {protocolo.numero}
                    </span>
                  </div>
                  {statusFilter === 'aberto' ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/25">
                      Aberto
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/25">
                      Em Atendimento
                    </span>
                  )}
                </div>

                {/* Info compacta */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground ml-5">
                  <span>◉ PDV {protocolo.codigo_pdv}</span>
                  <span>⏱ {formatDate(protocolo.data)} às {protocolo.hora}</span>
                </div>

                {/* Tags: tipo + mapa */}
                <div className="flex flex-wrap gap-1.5 mt-1.5 ml-5">
                  {protocolo.tipo_reposicao && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                      {protocolo.tipo_reposicao.toLowerCase()}
                    </span>
                  )}
                  {protocolo.mapa && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      Mapa {protocolo.mapa}
                    </span>
                  )}
                </div>

                {/* Botão encerrar - apenas para em_andamento */}
                {selectionMode !== 'view' && (
                  <Button
                    className="w-full mt-2.5 h-9 text-xs font-semibold flex items-center justify-center gap-2"
                    onClick={(e) => handleConfirmSelect(e, protocolo)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Encerrar Reposição
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t">
          <Button variant="outline" onClick={handleClose} className="w-full h-11">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
