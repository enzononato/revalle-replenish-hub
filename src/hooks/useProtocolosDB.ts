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
  // Novos campos de status de mensagem
  status_envio: string | null;
  status_encerramento: string | null;
  // Campos de encerramento pelo motorista
  encerrado_por_tipo: string | null;
  encerrado_por_motorista_id: string | null;
  encerrado_por_motorista_nome: string | null;
  foto_nota_fiscal_encerramento: string | null;
  foto_entrega_mercadoria: string | null;
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
    observacoesLog: Array.isArray(db.observacoes_log) ? db.observacoes_log as unknown as ObservacaoLog[] : [],
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
    contatoEmail: db.contato_email || undefined,
    // Mapear unidade do motorista para unidadeNome
    unidadeNome: db.motorista_unidade || undefined,
    // Novos campos de status de mensagem
    statusEnvio: (db.status_envio as 'pendente' | 'sucesso' | 'erro') || 'pendente',
    statusEncerramento: (db.status_encerramento as 'pendente' | 'sucesso' | 'erro') || 'pendente',
    // Campos de encerramento pelo motorista
    encerradoPorTipo: (db.encerrado_por_tipo as 'motorista' | 'admin') || undefined,
    encerradoPorMotoristaId: db.encerrado_por_motorista_id || undefined,
    encerradoPorMotoristaNome: db.encerrado_por_motorista_nome || undefined,
    fotoNotaFiscalEncerramento: db.foto_nota_fiscal_encerramento || undefined,
    fotoEntregaMercadoria: db.foto_entrega_mercadoria || undefined
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
    contato_email: p.contatoEmail || null,
    // Novos campos de status de mensagem
    status_envio: p.statusEnvio || 'pendente',
    status_encerramento: p.statusEncerramento || 'pendente',
    // Campos de encerramento pelo motorista
    encerrado_por_tipo: p.encerradoPorTipo || null,
    encerrado_por_motorista_id: p.encerradoPorMotoristaId || null,
    encerrado_por_motorista_nome: p.encerradoPorMotoristaNome || null,
    foto_nota_fiscal_encerramento: p.fotoNotaFiscalEncerramento || null,
    foto_entrega_mercadoria: p.fotoEntregaMercadoria || null
  };
}

export function useProtocolosDB() {
  const queryClient = useQueryClient();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isProtocolosRoute = pathname.startsWith('/protocolos');
  const isConfiguracoesRoute = pathname.startsWith('/configuracoes');
  const queryScope = isProtocolosRoute || isConfiguracoesRoute ? 'detalhado' : 'resumo';
  const protocolosQueryKey = ['protocolos', queryScope] as const;

  const { data: protocolos = [], isLoading, error } = useQuery({
    queryKey: protocolosQueryKey,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    queryFn: async () => {
      const allData: ProtocoloDB[] = [];

      // Mantém carregamento rápido: resumo menor para dashboard e carga maior apenas em telas que precisam detalhamento.
      const PAGE_SIZE = queryScope === 'resumo' ? 150 : 220;
      const MAX_ROWS = queryScope === 'resumo' ? 300 : 900;
      const BATCH_TIMEOUT_MS = queryScope === 'resumo' ? 4500 : 7000;
      let cursorCreatedAt: string | null = null;

      const runWithTimeout = <T,>(operation: PromiseLike<T>, timeoutMs: number): Promise<T> => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Tempo limite atingido ao carregar lote de protocolos'));
          }, timeoutMs);

          Promise.resolve(operation)
            .then((result) => {
              clearTimeout(timeoutId);
              resolve(result);
            })
            .catch((err) => {
              clearTimeout(timeoutId);
              reject(err);
            });
        });
      };

      while (allData.length < MAX_ROWS) {
        let query = supabase
          .from('protocolos')
          .select('*')
          .eq('ativo', true)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);

        if (cursorCreatedAt) {
          query = query.lt('created_at', cursorCreatedAt);
        }

        let response: { data: unknown[] | null; error: unknown | null };
        try {
          response = await runWithTimeout(query, BATCH_TIMEOUT_MS) as {
            data: unknown[] | null;
            error: unknown | null;
          };
        } catch (batchError) {
          // Se já carregou parte dos dados, preserva o que veio para não bloquear a tela.
          if (allData.length > 0) {
            console.warn('[protocolos] Timeout parcial ao carregar histórico. Exibindo dados já carregados.');
            break;
          }
          throw batchError;
        }

        const { data, error } = response;

        if (error) {
          // Se já carregou parte dos dados, preserva o que veio para não bloquear a tela.
          if (allData.length > 0) {
            console.warn('[protocolos] Timeout parcial ao carregar histórico. Exibindo dados já carregados.');
            break;
          }
          throw error;
        }

        if (!data?.length) {
          break;
        }

        allData.push(...(data as unknown as ProtocoloDB[]));

        const lastRow = data[data.length - 1] as ProtocoloDB | undefined;
        cursorCreatedAt = lastRow?.created_at || null;

        if (!cursorCreatedAt) {
          break;
        }

        if (data.length < PAGE_SIZE) {
          break;
        }
      }

      return allData.slice(0, MAX_ROWS).map(dbToProtocolo);
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
    // Optimistic update para resposta instantânea
    onMutate: async (newProtocolo) => {
      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: protocolosQueryKey });

      // Salvar estado anterior
      const previousProtocolos = queryClient.getQueryData<Protocolo[]>(protocolosQueryKey);

      // Atualizar cache otimisticamente
      queryClient.setQueryData<Protocolo[]>(protocolosQueryKey, (old) => 
        old?.map(p => p.id === newProtocolo.id ? newProtocolo : p) ?? []
      );

      return { previousProtocolos };
    },
    onError: (error, _newProtocolo, context) => {
      // Reverter para estado anterior em caso de erro
      if (context?.previousProtocolos) {
        queryClient.setQueryData(protocolosQueryKey, context.previousProtocolos);
      }
      console.error('Erro ao atualizar protocolo:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar protocolo',
        variant: 'destructive'
      });
    },
    onSettled: () => {
      // Revalidar dados após mutação (em background)
      queryClient.invalidateQueries({ queryKey: ['protocolos'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('protocolos')
        .update({ ativo: false } as never)
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

  // Realtime removido para melhorar performance de carregamento

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
