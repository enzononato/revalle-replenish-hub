import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Protocolo, Produto, FotosProtocolo, ObservacaoLog } from '@/types';
import { toast } from '@/hooks/use-toast';

interface ProtocoloDB {
  id: string;
  numero: string;
  motorista_id: string | null;
  motorista_nome: string;
  motorista_codigo: string | null;
  motorista_whatsapp: string | null;
  motorista_email: string | null;
  data: string;
  hora: string;
  status: string;
  validacao: boolean | null;
  lancado: boolean | null;
  enviado_lancar: boolean | null;
  enviado_encerrar: boolean | null;
  tipo_reposicao: string | null;
  causa: string | null;
  mapa: string | null;
  codigo_pdv: string | null;
  nota_fiscal: string | null;
  produtos: Produto[] | null;
  fotos_protocolo: FotosProtocolo | null;
  observacao_geral: string | null;
  observacoes_log: ObservacaoLog[] | null;
  mensagem_encerramento: string | null;
  arquivo_encerramento: string | null;
  oculto: boolean | null;
  habilitar_reenvio: boolean | null;
  created_at: string | null;
  // Campos de status de envio WhatsApp
  enviado_lancar_status: string | null;
  enviado_lancar_erro: string | null;
  enviado_encerrar_status: string | null;
  enviado_encerrar_erro: string | null;
  cliente_telefone: string | null;
  motorista_unidade: string | null;
  contato_whatsapp: string | null;
  contato_email: string | null;
}

// Convert DB record to Protocolo type
function dbToProtocolo(db: ProtocoloDB): Protocolo {
  return {
    id: db.id,
    numero: db.numero,
    motorista: {
      id: db.motorista_id || '',
      nome: db.motorista_nome,
      codigo: db.motorista_codigo || '',
      dataNascimento: '',
      unidade: db.motorista_unidade || '',
      funcao: 'motorista',
      setor: 'sede',
      whatsapp: db.motorista_whatsapp || '',
      email: db.motorista_email || '',
      createdAt: ''
    },
    data: db.data,
    hora: db.hora,
    sla: '4h',
    status: db.status as 'aberto' | 'em_andamento' | 'encerrado',
    validacao: db.validacao ?? false,
    lancado: db.lancado ?? false,
    enviadoLancar: db.enviado_lancar ?? false,
    enviadoEncerrar: db.enviado_encerrar ?? false,
    tipoReposicao: db.tipo_reposicao || undefined,
    causa: db.causa || undefined,
    mapa: db.mapa || undefined,
    codigoPdv: db.codigo_pdv || undefined,
    notaFiscal: db.nota_fiscal || undefined,
    produtos: db.produtos || [],
    fotosProtocolo: db.fotos_protocolo || undefined,
    observacaoGeral: db.observacao_geral || undefined,
    observacoesLog: db.observacoes_log || [],
    mensagemEncerramento: db.mensagem_encerramento || undefined,
    arquivoEncerramento: db.arquivo_encerramento || undefined,
    oculto: db.oculto ?? false,
    habilitarReenvio: db.habilitar_reenvio ?? false,
    createdAt: db.created_at || new Date().toISOString(),
    // Campos de status de envio WhatsApp
    enviadoLancarStatus: (db.enviado_lancar_status as 'pendente' | 'enviado' | 'erro') || 'pendente',
    enviadoLancarErro: db.enviado_lancar_erro || undefined,
    enviadoEncerrarStatus: (db.enviado_encerrar_status as 'pendente' | 'enviado' | 'erro') || 'pendente',
    enviadoEncerrarErro: db.enviado_encerrar_erro || undefined,
    clienteTelefone: db.cliente_telefone || undefined,
    contatoWhatsapp: db.contato_whatsapp || undefined,
    contatoEmail: db.contato_email || undefined
  };
}

// Convert Protocolo to DB format
function protocoloToDB(p: Protocolo): Omit<ProtocoloDB, 'id'> {
  return {
    numero: p.numero,
    motorista_id: p.motorista.id,
    motorista_nome: p.motorista.nome,
    motorista_codigo: p.motorista.codigo,
    motorista_whatsapp: p.motorista.whatsapp,
    motorista_email: p.motorista.email || null,
    data: p.data,
    hora: p.hora,
    status: p.status,
    validacao: p.validacao,
    lancado: p.lancado,
    enviado_lancar: p.enviadoLancar,
    enviado_encerrar: p.enviadoEncerrar,
    tipo_reposicao: p.tipoReposicao || null,
    causa: p.causa || null,
    mapa: p.mapa || null,
    codigo_pdv: p.codigoPdv || null,
    nota_fiscal: p.notaFiscal || null,
    produtos: p.produtos || null,
    fotos_protocolo: p.fotosProtocolo || null,
    observacao_geral: p.observacaoGeral || null,
    observacoes_log: p.observacoesLog || null,
    mensagem_encerramento: p.mensagemEncerramento || null,
    arquivo_encerramento: p.arquivoEncerramento || null,
    oculto: p.oculto ?? false,
    habilitar_reenvio: p.habilitarReenvio ?? false,
    created_at: p.createdAt,
    // Campos de status de envio WhatsApp
    enviado_lancar_status: p.enviadoLancarStatus || 'pendente',
    enviado_lancar_erro: p.enviadoLancarErro || null,
    enviado_encerrar_status: p.enviadoEncerrarStatus || 'pendente',
    enviado_encerrar_erro: p.enviadoEncerrarErro || null,
    cliente_telefone: p.clienteTelefone || null,
    motorista_unidade: p.motorista.unidade || null,
    contato_whatsapp: p.contatoWhatsapp || null,
    contato_email: p.contatoEmail || null
  };
}

export function useProtocolosDB() {
  const queryClient = useQueryClient();

  const { data: protocolos = [], isLoading, error } = useQuery({
    queryKey: ['protocolos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocolos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as ProtocoloDB[]).map(dbToProtocolo);
    }
  });

  const addMutation = useMutation({
    mutationFn: async (protocolo: Protocolo) => {
      const dbData = protocoloToDB(protocolo);
      const { data, error } = await supabase
        .from('protocolos')
        .insert(dbData as never)
        .select()
        .single();

      if (error) throw error;
      return dbToProtocolo(data as unknown as ProtocoloDB);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocolos'] });
    },
    onError: (error) => {
      console.error('Erro ao adicionar protocolo:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar protocolo no banco de dados',
        variant: 'destructive'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (protocolo: Protocolo) => {
      const dbData = protocoloToDB(protocolo);
      const { data, error } = await supabase
        .from('protocolos')
        .update(dbData as never)
        .eq('id', protocolo.id)
        .select()
        .single();

      if (error) throw error;
      return dbToProtocolo(data as unknown as ProtocoloDB);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocolos'] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar protocolo:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar protocolo',
        variant: 'destructive'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('protocolos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocolos'] });
    },
    onError: (error) => {
      console.error('Erro ao deletar protocolo:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao deletar protocolo',
        variant: 'destructive'
      });
    }
  });

  return {
    protocolos,
    isLoading,
    error,
    addProtocolo: addMutation.mutateAsync,
    updateProtocolo: updateMutation.mutateAsync,
    deleteProtocolo: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
