import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PdvAutocomplete } from '@/components/PdvAutocomplete';
import { toast } from '@/hooks/use-toast';
import { Motorista } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, MapPin, FileText, Tag, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface PosRotaProps {
  motorista: Motorista;
}

const TIPOS_POS_ROTA = [
  { value: 'inversao', label: 'Inversão' },
  { value: 'avaria', label: 'Avaria' },
  { value: 'erro_carregamento', label: 'Erro de Carregamento' },
  { value: 'erro_entrega', label: 'Erro de Entrega' },
];

export function PosRota({ motorista }: PosRotaProps) {
  const [mapa, setMapa] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [tipo, setTipo] = useState('');
  const [codigoPdv, setCodigoPdv] = useState('');
  const [pdvSelecionado, setPdvSelecionado] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [numeroProtocolo, setNumeroProtocolo] = useState('');

  const precisaPdv = tipo === 'erro_entrega' || tipo === 'avaria' || tipo === 'inversao';
  const precisaNF = tipo === 'avaria' || tipo === 'inversao';

  const canSubmit = mapa.trim() && tipo && (!precisaPdv || (codigoPdv.trim() && pdvSelecionado));

  const handlePdvChange = (value: string, pdv?: { codigo: string }) => {
    setCodigoPdv(value);
    setPdvSelecionado(!!pdv);
  };

  const handleTipoChange = (value: string) => {
    setTipo(value);
    // Reset conditional fields
    if (value !== 'erro_entrega' && value !== 'avaria' && value !== 'inversao') {
      setCodigoPdv('');
      setPdvSelecionado(false);
    }
    if (value !== 'avaria' && value !== 'inversao') {
      setNotaFiscal('');
    }
  };

  const resetForm = () => {
    setMapa('');
    setNotaFiscal('');
    setTipo('');
    setCodigoPdv('');
    setPdvSelecionado(false);
    setObservacao('');
    setEnviado(false);
    setNumeroProtocolo('');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      const agora = new Date();
      const numero = `POSROTA-${format(agora, 'yyyyMMddHHmmss')}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
      const tipoLabel = TIPOS_POS_ROTA.find(t => t.value === tipo)?.label || tipo;

      const { error } = await supabase.from('protocolos').insert({
        numero,
        data: format(agora, 'yyyy-MM-dd'),
        hora: format(agora, 'HH:mm'),
        status: 'aberto',
        tipo_reposicao: 'pos_rota',
        causa: `SOBRA EM ROTA - ${tipoLabel.toUpperCase()}`,
        mapa: mapa.trim(),
        nota_fiscal: notaFiscal.trim() || null,
        codigo_pdv: precisaPdv ? codigoPdv.trim() : null,
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        motorista_codigo: motorista.codigo,
        motorista_whatsapp: motorista.whatsapp || null,
        motorista_email: motorista.email || null,
        motorista_unidade: motorista.unidade,
        observacao_geral: observacao.trim() || null,
        observacoes_log: JSON.stringify([{
          id: crypto.randomUUID(),
          usuarioNome: motorista.nome,
          usuarioId: motorista.id,
          data: format(agora, 'dd/MM/yyyy'),
          hora: format(agora, 'HH:mm'),
          acao: 'Registrou pós-rota',
          texto: `Sobra em rota - ${tipoLabel}${precisaPdv ? ` | PDV: ${codigoPdv.trim()}` : ''}${notaFiscal.trim() ? ` | NF: ${notaFiscal.trim()}` : ''}`
        }]),
      });

      if (error) throw error;

      // Audit log
      await supabase.from('audit_logs').insert({
        acao: 'pos_rota',
        tabela: 'protocolos',
        registro_id: numero,
        registro_dados: {
          numero,
          tipo: tipoLabel,
          mapa: mapa.trim(),
          codigo_pdv: precisaPdv ? codigoPdv.trim() : null,
          nota_fiscal: notaFiscal.trim() || null,
        },
        usuario_nome: motorista.nome,
        usuario_role: 'motorista',
        usuario_unidade: motorista.unidade,
      });

      setNumeroProtocolo(numero);
      setEnviado(true);

      toast({
        title: 'Pós-Rota registrado!',
        description: `Registro ${numero} criado com sucesso.`,
      });
    } catch (err) {
      console.error('Erro ao registrar pós-rota:', err);
      toast({
        title: 'Erro ao registrar',
        description: 'Não foi possível registrar o pós-rota. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tela de sucesso
  if (enviado) {
    return (
      <div className="pb-6 space-y-4">
        <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">Pós-Rota Registrado!</h3>
          <p className="text-sm text-muted-foreground">
            Registro <span className="font-mono font-medium text-foreground">{numeroProtocolo}</span> criado com sucesso.
          </p>
          <Button onClick={resetForm} className="w-full h-12 text-sm font-semibold rounded-xl">
            Novo Registro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6 space-y-4">
      {/* Mapa */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50">
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Dados da Rota
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Mapa *</Label>
            <Input
              placeholder="Número do mapa"
              value={mapa}
              onChange={(e) => setMapa(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Nota Fiscal</Label>
            <Input
              placeholder="Número da nota fiscal (opcional)"
              value={notaFiscal}
              onChange={(e) => setNotaFiscal(e.target.value)}
              className="h-12 text-base"
            />
          </div>
        </div>
      </div>

      {/* Tipo e Causa */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50">
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Tipo e Causa — Sobra em Rota
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tipo *</Label>
            <Select value={tipo} onValueChange={handleTipoChange}>
              <SelectTrigger className="h-12 text-base truncate text-left gap-2">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_POS_ROTA.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-sm">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PDV condicional */}
          {precisaPdv && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Código do PDV *</Label>
              <PdvAutocomplete
                value={codigoPdv}
                onChange={handlePdvChange}
                unidade={motorista.unidade}
                placeholder="Buscar PDV..."
                className="h-12 text-base"
              />
              {codigoPdv && !pdvSelecionado && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Selecione um PDV da lista
                </p>
              )}
            </div>
          )}

          {/* NF condicional para avaria e inversão */}
          {precisaNF && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nota Fiscal do PDV</Label>
              <Input
                placeholder="NF relacionada ao PDV"
                value={notaFiscal}
                onChange={(e) => setNotaFiscal(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          )}
        </div>
      </div>

      {/* Observação */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50">
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Observação
          </h3>
        </div>
        <div className="p-4">
          <Textarea
            placeholder="Informações adicionais sobre a sobra em rota..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
        </div>
      </div>

      {/* Botão enviar */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        className="w-full h-12 text-sm font-semibold rounded-xl"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Registrando...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Registrar Pós-Rota
          </>
        )}
      </Button>
    </div>
  );
}
