import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Package, ImageIcon, Loader2, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ObservacaoLog } from '@/types';
import { uploadFotoParaStorage } from '@/utils/uploadFotoStorage';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
import { getDirectStorageUrl } from '@/utils/urlHelpers';

interface ProdutoItem {
  codigo?: string;
  nome?: string;
  unidade?: string;
  quantidade?: number | string;
}

interface ConfirmacaoProduto {
  status: 'voltou' | 'parcial' | 'nao_voltou';
  quantidade_retornada: number;
  foto?: string;
  conferente_nome?: string;
  conferente_id?: string;
  data?: string;
  hora?: string;
}

interface Props {
  sobraId: string;
  numero: string;
  produtos: ProdutoItem[];
  conferenciaStatus: string | null;
  confirmacaoConferente: Record<string, ConfirmacaoProduto> | null;
  destinoFinal?: string | null;
  observacaoFinalizacao?: string | null;
  finalizadoPorNome?: string | null;
  finalizadoEm?: string | null;
  observacoesLog: ObservacaoLog[];
  onUpdated: () => void;
}

const DESTINOS = [
  { value: 'estoque', label: 'Devolver ao estoque' },
  { value: 'descarte', label: 'Descarte' },
  { value: 'reentrega', label: 'Reentregar' },
  { value: 'outro', label: 'Outro' },
];

export function ConferenciaSobraSection({
  sobraId,
  numero,
  produtos,
  conferenciaStatus,
  confirmacaoConferente,
  destinoFinal,
  observacaoFinalizacao,
  finalizadoPorNome,
  finalizadoEm,
  observacoesLog,
  onUpdated,
}: Props) {
  const { user } = useAuth();
  const [confirmacoes, setConfirmacoes] = useState<Record<string, ConfirmacaoProduto>>(
    confirmacaoConferente || {}
  );
  const [salvandoConferencia, setSalvandoConferencia] = useState(false);
  const [uploadingFotoIdx, setUploadingFotoIdx] = useState<string | null>(null);
  const [destino, setDestino] = useState(destinoFinal || '');
  const [obsFinal, setObsFinal] = useState(observacaoFinalizacao || '');
  const [finalizando, setFinalizando] = useState(false);

  const podeConferir = ['conferente', 'admin', 'distribuicao'].includes(user?.nivel || '');
  const podeFinalizar = ['admin', 'distribuicao'].includes(user?.nivel || '');

  const status = conferenciaStatus || 'pendente';
  const isPendenteConferente = status === 'pendente';
  const isAguardandoFinalizacao = status === 'confirmado_conferente';
  const isFinalizado = status === 'finalizado';

  const produtosKeys = useMemo(
    () => produtos.map((p, i) => p.codigo || `idx_${i}`),
    [produtos]
  );

  const updateProduto = (key: string, patch: Partial<ConfirmacaoProduto>) => {
    setConfirmacoes((prev) => ({
      ...prev,
      [key]: {
        status: 'voltou',
        quantidade_retornada: 0,
        ...prev[key],
        ...patch,
      },
    }));
  };

  const handleFoto = async (key: string, file: File) => {
    setUploadingFotoIdx(key);
    try {
      const base64 = await fileToBase64(file);
      const url = await uploadFotoParaStorage(base64, numero, `conferencia_${key}`);
      if (!url) throw new Error('upload falhou');
      updateProduto(key, { foto: url });
      toast.success('Foto anexada');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploadingFotoIdx(null);
    }
  };

  const handleConfirmarConferencia = async () => {
    if (!user) return;
    // valida: cada produto precisa ter status definido
    const faltando = produtos.some((p, i) => {
      const key = p.codigo || `idx_${i}`;
      return !confirmacoes[key]?.status;
    });
    if (faltando) {
      toast.error('Marque o status de cada produto antes de confirmar.');
      return;
    }

    setSalvandoConferencia(true);
    try {
      const agora = new Date();
      const dataStr = format(agora, 'dd/MM/yyyy');
      const horaStr = format(agora, 'HH:mm');

      // preenche meta de cada confirmação
      const finalConfirmacoes: Record<string, ConfirmacaoProduto> = {};
      produtos.forEach((p, i) => {
        const key = p.codigo || `idx_${i}`;
        const c = confirmacoes[key];
        const qtdInformada = Number(p.quantidade) || 0;
        const qtdRet =
          c.status === 'voltou'
            ? qtdInformada
            : c.status === 'nao_voltou'
            ? 0
            : Number(c.quantidade_retornada) || 0;
        finalConfirmacoes[key] = {
          status: c.status,
          quantidade_retornada: qtdRet,
          foto: c.foto,
          conferente_nome: user.nome || user.email || 'Conferente',
          conferente_id: user.id,
          data: dataStr,
          hora: horaStr,
        };
      });

      const resumo = produtos
        .map((p, i) => {
          const key = p.codigo || `idx_${i}`;
          const c = finalConfirmacoes[key];
          const label =
            c.status === 'voltou'
              ? 'Voltou tudo'
              : c.status === 'parcial'
              ? `Voltou parcial (${c.quantidade_retornada})`
              : 'Não voltou';
          return `${p.nome || p.codigo || `Item ${i + 1}`}: ${label}`;
        })
        .join(' | ');

      const novoLog: ObservacaoLog = {
        id: crypto.randomUUID(),
        usuarioNome: user.nome || user.email || 'Conferente',
        usuarioId: user.id,
        data: dataStr,
        hora: horaStr,
        acao: 'Conferência confirmada',
        texto: resumo,
      };

      const logsAtuais = Array.isArray(observacoesLog) ? observacoesLog : [];

      const { error } = await supabase
        .from('protocolos')
        .update({
          confirmacao_conferente: finalConfirmacoes as never,
          conferencia_status: 'confirmado_conferente',
          observacoes_log: [...logsAtuais, novoLog] as never,
        } as never)
        .eq('id', sobraId);

      if (error) throw error;

      toast.success('Conferência confirmada. Aguardando finalização.');
      onUpdated();
    } catch (err) {
      console.error('Erro ao confirmar conferência:', err);
      toast.error('Erro ao confirmar conferência');
    } finally {
      setSalvandoConferencia(false);
    }
  };

  const handleFinalizar = async () => {
    if (!user) return;
    if (!destino) {
      toast.error('Escolha o destino final.');
      return;
    }
    if (!obsFinal.trim()) {
      toast.error('Descreva uma observação de finalização.');
      return;
    }

    setFinalizando(true);
    try {
      const agora = new Date();
      const dataStr = format(agora, 'dd/MM/yyyy');
      const horaStr = format(agora, 'HH:mm');
      const destinoLabel = DESTINOS.find((d) => d.value === destino)?.label || destino;

      const novoLog: ObservacaoLog = {
        id: crypto.randomUUID(),
        usuarioNome: user.nome || user.email || 'Admin',
        usuarioId: user.id,
        data: dataStr,
        hora: horaStr,
        acao: 'Sobra finalizada',
        texto: `Destino: ${destinoLabel}. Obs: ${obsFinal.trim()}`,
      };

      const logsAtuais = Array.isArray(observacoesLog) ? observacoesLog : [];

      const { error } = await supabase
        .from('protocolos')
        .update({
          conferencia_status: 'finalizado',
          destino_final: destino,
          observacao_finalizacao: obsFinal.trim(),
          finalizado_por_nome: user.nome || user.email || 'Admin',
          finalizado_por_id: user.id,
          finalizado_em: agora.toISOString(),
          status: 'encerrado',
          observacoes_log: [...logsAtuais, novoLog] as never,
        } as never)
        .eq('id', sobraId);

      if (error) throw error;

      toast.success('Sobra finalizada e encerrada.');
      onUpdated();
    } catch (err) {
      console.error('Erro ao finalizar sobra:', err);
      toast.error('Erro ao finalizar sobra');
    } finally {
      setFinalizando(false);
    }
  };

  if (produtos.length === 0) return null;

  return (
    <div className="border-t pt-3 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Conferência (origem: inversão/avaria)
        </p>
        <Badge
          variant="outline"
          className={
            isFinalizado
              ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-500/10'
              : isAguardandoFinalizacao
              ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-500/10'
              : 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-500/10'
          }
        >
          {isFinalizado
            ? 'Finalizado'
            : isAguardandoFinalizacao
            ? 'Aguardando finalização'
            : 'Pendente conferente'}
        </Badge>
      </div>

      {/* Etapa 1: confirmação por produto */}
      <div className="space-y-2">
        {produtos.map((p, i) => {
          const key = p.codigo || `idx_${i}`;
          const c = confirmacoes[key];
          const readonly = !isPendenteConferente || !podeConferir;
          const qtdInformada = Number(p.quantidade) || 0;

          return (
            <div
              key={key}
              className="bg-muted/40 rounded-lg p-3 border border-border/40 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 shrink-0" />
                    {p.nome || `Item ${i + 1}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.codigo && <span className="font-mono">Cód {p.codigo} · </span>}
                    Qtd informada: {qtdInformada} {p.unidade || ''}
                  </p>
                </div>
                {c?.foto && (
                  <a
                    href={getDirectStorageUrl(c.foto)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 w-12 h-12 rounded border border-border overflow-hidden"
                  >
                    <img
                      src={getDirectStorageUrl(c.foto)}
                      alt="Conferência"
                      className="w-full h-full object-cover"
                    />
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['voltou', 'parcial', 'nao_voltou'] as const).map((s) => {
                  const active = c?.status === s;
                  return (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      disabled={readonly}
                      className="h-7 text-xs px-2.5"
                      onClick={() => updateProduto(key, { status: s })}
                    >
                      {s === 'voltou' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {s === 'nao_voltou' && <XCircle className="w-3 h-3 mr-1" />}
                      {s === 'voltou' ? 'Voltou tudo' : s === 'parcial' ? 'Parcial' : 'Não voltou'}
                    </Button>
                  );
                })}
              </div>

              {c?.status === 'parcial' && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Qtd retornada:</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={qtdInformada}
                    value={c.quantidade_retornada || ''}
                    disabled={readonly}
                    onChange={(e) =>
                      updateProduto(key, {
                        quantidade_retornada: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="h-8 text-sm w-24"
                  />
                  <span className="text-xs text-muted-foreground">/ {qtdInformada}</span>
                </div>
              )}

              {!readonly && (
                <div>
                  <input
                    id={`foto-${key}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFoto(key, f);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={uploadingFotoIdx === key}
                    onClick={() => document.getElementById(`foto-${key}`)?.click()}
                  >
                    {uploadingFotoIdx === key ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3 h-3 mr-1" />
                    )}
                    {c?.foto ? 'Trocar foto' : 'Anexar foto'}
                  </Button>
                </div>
              )}

              {readonly && c && (
                <p className="text-xs text-muted-foreground">
                  Por {c.conferente_nome || '-'} em {c.data || '-'} {c.hora || ''}
                </p>
              )}
            </div>
          );
        })}

        {isPendenteConferente && podeConferir && (
          <Button
            className="w-full"
            disabled={salvandoConferencia}
            onClick={handleConfirmarConferencia}
          >
            {salvandoConferencia && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Confirmar conferência
          </Button>
        )}
      </div>

      {/* Etapa 2: finalização (admin/distribuição) */}
      {(isAguardandoFinalizacao || isFinalizado) && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">Tratativa final</p>
          <div className="space-y-2">
            <Label className="text-xs">Destino</Label>
            <Select
              value={destino}
              onValueChange={setDestino}
              disabled={isFinalizado || !podeFinalizar}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione o destino" />
              </SelectTrigger>
              <SelectContent>
                {DESTINOS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label className="text-xs">Observação</Label>
            <Textarea
              value={obsFinal}
              onChange={(e) => setObsFinal(e.target.value)}
              disabled={isFinalizado || !podeFinalizar}
              placeholder="Descreva a tratativa final..."
              className="min-h-[60px] text-sm"
            />

            {isFinalizado && finalizadoPorNome && (
              <p className="text-xs text-muted-foreground">
                Finalizado por {finalizadoPorNome}
                {finalizadoEm
                  ? ` em ${format(new Date(finalizadoEm), "dd/MM/yyyy 'às' HH:mm")}`
                  : ''}
              </p>
            )}

            {!isFinalizado && podeFinalizar && (
              <Button className="w-full" disabled={finalizando} onClick={handleFinalizar}>
                {finalizando && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Finalizar tratativa
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
