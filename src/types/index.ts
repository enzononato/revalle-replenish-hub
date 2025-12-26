export type UserRole = 'admin' | 'distribuicao' | 'conferente';

export interface User {
  id: string;
  nome: string;
  email: string;
  nivel: UserRole;
  unidade: string;
}

export type FuncaoMotorista = 'motorista' | 'ajudante_entrega';
export type SetorMotorista = 'interior' | 'sede';

export interface Motorista {
  id: string;
  nome: string;
  codigo: string;
  dataNascimento: string;
  unidade: string;
  funcao: FuncaoMotorista;
  setor: SetorMotorista;
  whatsapp?: string;
  email?: string;
  senha?: string;
  createdAt: string;
}

export interface Unidade {
  id: string;
  nome: string;
  codigo: string;
  cnpj: string;
  createdAt: string;
}

export interface Produto {
  codigo: string;
  nome: string;
  unidade: string;
  quantidade: number;
  validade: string;
  observacao?: string;
}

export interface Observacao {
  id: string;
  data: string;
  hora: string;
  texto: string;
}

export interface ObservacaoLog {
  id: string;
  usuarioNome: string;
  usuarioId: string;
  data: string;
  hora: string;
  acao: string;
  texto: string;
}

export interface FotosProtocolo {
  fotoMotoristaPdv?: string;
  fotoLoteProduto?: string;
  fotoAvaria?: string;
}

export interface Protocolo {
  id: string;
  numero: string;
  motorista: Motorista;
  data: string;
  hora: string;
  sla: string;
  status: 'aberto' | 'em_andamento' | 'encerrado';
  validacao: boolean;
  lancado: boolean;
  enviadoLancar: boolean;
  enviadoEncerrar: boolean;
  tipoReposicao?: string;
  causa?: string;
  unidadeId?: number;
  unidadeNome?: string;
  codigoPdv?: string;
  mapa?: string;
  notaFiscal?: string;
  observacaoGeral?: string;
  produtos?: Produto[];
  fotos?: string[];
  fotosProtocolo?: FotosProtocolo;
  historicoObservacoes?: Observacao[];
  habilitarReenvio?: boolean;
  createdAt: string;
  observacoesLog?: ObservacaoLog[];
  mensagemEncerramento?: string;
  arquivoEncerramento?: string;
  oculto?: boolean;
  // Campos de status de envio WhatsApp (legado)
  enviadoLancarStatus?: 'pendente' | 'enviado' | 'erro';
  enviadoLancarErro?: string;
  enviadoEncerrarStatus?: 'pendente' | 'enviado' | 'erro';
  enviadoEncerrarErro?: string;
  clienteTelefone?: string;
  // Campos de contato preenchidos no formulário
  contatoWhatsapp?: string;
  contatoEmail?: string;
  // Novos campos de status de mensagem
  statusEnvio?: 'pendente' | 'sucesso' | 'erro';
  statusEncerramento?: 'pendente' | 'sucesso' | 'erro';
}

export interface DashboardStats {
  emAberto: number;
  encerrados: number;
  totalProtocolos: number;
  totalMotoristas: number;
  totalHoje: number;
}

export interface RankingItem {
  id: string;
  nome: string;
  quantidade: number;
}
