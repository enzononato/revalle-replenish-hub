import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Send, RefreshCw, Package } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatPhone, isValidPhone } from '@/lib/phone';
import type { Representante } from '@/contexts/RnAuthContext';

interface ProtocoloRow {
  id: string;
  numero: string;
  motorista_nome: string;
  codigo_pdv: string | null;
  data: string;
  hora: string;
  status: string;
  tipo_reposicao: string | null;
  causa: string | null;
  produtos: any;
  nota_fiscal: string | null;
  mapa: string | null;
}

interface RnReenvioModalProps {
  protocolo: ProtocoloRow | null;
  open: boolean;
  onClose: () => void;
  representante: Representante;
}

const N8N_WEBHOOK_URL = 'https://n8n.revalle.com.br/webhook/reposicaowpp';


export function RnReenvioModal({ protocolo, open, onClose, representante }: RnReenvioModalProps) {
  const [telefone, setTelefone] = useState('');
  const [enviando, setEnviando] = useState(false);
  const isMobile = useIsMobile();

  if (!protocolo) return null;

  const telefoneValido = isValidPhone(telefone);

  const parseProdutos = (produtos: any) => {
    if (!produtos) return [];
    if (Array.isArray(produtos)) return produtos;
    try { return JSON.parse(produtos); } catch { return []; }
  };

  const prods = parseProdutos(protocolo.produtos);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberto': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-300">Aberto</Badge>;
      case 'em_andamento': return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-300">Em Atendimento</Badge>;
      case 'encerrado': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300">Encerrado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleReenviar = async (tipo: 'lancar' | 'encerrar') => {
    if (!telefoneValido) return;
    setEnviando(true);

    try {
      let webhookPayload: Record<string, unknown>;

      if (tipo === 'lancar') {
        webhookPayload = {
          tipo: 'criacao_protocolo',
          numero: protocolo.numero,
          data: protocolo.data,
          hora: protocolo.hora,
          mapa: protocolo.mapa || '',
          codigoPdv: protocolo.codigo_pdv || '',
          notaFiscal: protocolo.nota_fiscal || '',
          motoristaNome: protocolo.motorista_nome,
          unidade: representante.unidade,
          tipoReposicao: (protocolo.tipo_reposicao || '').toUpperCase(),
          causa: protocolo.causa || '',
          produtos: prods,
          whatsappContato: telefone,
          observacaoGeral: ''
        };
      } else {
        webhookPayload = {
          tipo: 'encerramento',
          numero: protocolo.numero,
          data: protocolo.data,
          hora: protocolo.hora,
          dataEncerramento: format(new Date(), 'dd/MM/yyyy'),
          horaEncerramento: format(new Date(), 'HH:mm'),
          status: 'encerrado',
          mapa: protocolo.mapa,
          notaFiscal: protocolo.nota_fiscal,
          codigoPdv: protocolo.codigo_pdv,
          tipoReposicao: protocolo.tipo_reposicao,
          causa: protocolo.causa,
          motoristaNome: protocolo.motorista_nome,
          unidade: representante.unidade,
          clienteTelefone: telefone,
          contatoWhatsapp: telefone,
          produtos: prods,
          mensagemEncerramento: '',
        };
      }

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar webhook: ${response.status}`);
      }

      const { data: currentProto } = await supabase
        .from('protocolos')
        .select('observacoes_log, contato_whatsapp')
        .eq('id', protocolo.id)
        .single();

      const existingLogs = Array.isArray(currentProto?.observacoes_log) ? currentProto.observacoes_log : [];
      const newLog = {
        id: Date.now().toString(),
        usuarioNome: `RN: ${representante.nome}`,
        usuarioId: representante.id,
        data: format(new Date(), 'dd/MM/yyyy'),
        hora: format(new Date(), 'HH:mm'),
        acao: tipo === 'lancar' ? 'Reenviou mensagem de lançamento' : 'Reenviou mensagem de encerramento',
        texto: `Mensagem reenviada pelo RN ${representante.nome} para o número ${telefone}`
      };

      await supabase
        .from('protocolos')
        .update({
          observacoes_log: [...existingLogs, newLog] as any,
          contato_whatsapp: telefone,
        } as any)
        .eq('id', protocolo.id);

      await supabase.from('audit_logs').insert([{
        acao: 'reenvio',
        tabela: 'protocolos',
        registro_id: protocolo.id,
        registro_dados: {
          numero: protocolo.numero,
          tipo_reenvio: tipo,
          telefone,
        },
        usuario_nome: representante.nome,
        usuario_role: 'RN',
        usuario_unidade: representante.unidade,
      }]);

      toast.success(`Mensagem de ${tipo === 'lancar' ? 'lançamento' : 'encerramento'} reenviada com sucesso!`);
      setTelefone('');
      onClose();
    } catch (error) {
      console.error('Erro ao reenviar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
      toast.error(`Falha ao reenviar: ${errorMessage}`);
    } finally {
      setEnviando(false);
    }
  };

  const modalBody = (
    <div className="space-y-3">
      {/* Protocol info */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Motorista: <span className="text-foreground font-medium">{protocolo.motorista_nome}</span></span>
        <span>PDV: <span className="text-foreground font-medium">{protocolo.codigo_pdv || '—'}</span></span>
        <span>Data: <span className="text-foreground">{protocolo.data}</span></span>
        <span>Hora: <span className="text-foreground">{protocolo.hora}</span></span>
        {protocolo.tipo_reposicao && <span>Tipo: <span className="text-foreground capitalize">{protocolo.tipo_reposicao}</span></span>}
        {protocolo.causa && <span>Causa: <span className="text-foreground">{protocolo.causa}</span></span>}
        {protocolo.nota_fiscal && <span>NF: <span className="text-foreground">{protocolo.nota_fiscal}</span></span>}
        {protocolo.mapa && <span>Mapa: <span className="text-foreground">{protocolo.mapa}</span></span>}
      </div>

      {/* Products */}
      {prods.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-1 mb-1">
            <Package size={12} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Produtos ({prods.length})</span>
          </div>
          <div className="space-y-0.5 max-h-24 overflow-y-auto">
            {prods.map((prod: any, i: number) => (
              <p key={i} className="text-xs text-foreground">
                {prod.nome || prod.produto} — {prod.quantidade} {prod.unidade}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Resend section */}
      <div className="pt-2 border-t border-border space-y-2">
        <div className="flex items-center gap-1.5">
          <Phone size={14} className="text-primary" />
          <span className="text-sm font-semibold">Reenviar mensagem</span>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Telefone do PDV:</label>
          <Input
            value={telefone}
            onChange={(e) => setTelefone(formatPhone(e.target.value))}
            placeholder="(XX) XXXXX-XXXX"
            maxLength={16}
            className="h-9"
          />
          {telefone && !telefoneValido && (
            <p className="text-xs text-destructive mt-1">Informe um telefone válido (10 ou 11 dígitos)</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReenviar('lancar')}
            disabled={enviando || !telefoneValido}
            className="flex-1 gap-1.5 text-xs"
          >
            {enviando ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            Lançamento
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => handleReenviar('encerrar')}
            disabled={enviando || !telefoneValido}
            className="flex-1 gap-1.5 text-xs"
          >
            {enviando ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            Encerramento
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-2">
              <span className="font-mono">#{protocolo.numero}</span>
              {getStatusBadge(protocolo.status)}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {modalBody}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">#{protocolo.numero}</span>
            {getStatusBadge(protocolo.status)}
          </DialogTitle>
        </DialogHeader>
        {modalBody}
      </DialogContent>
    </Dialog>
  );
}
