export type UserRole = 'admin' | 'comum';

export interface User {
  id: string;
  nome: string;
  email: string;
  nivel: UserRole;
  unidade: string;
}

export interface Motorista {
  id: string;
  nome: string;
  codigo: string;
  dataNascimento: string;
  unidade: string;
  whatsapp: string;
  email?: string;
  codigoPdv?: string;
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
  historicoObservacoes?: Observacao[];
  habilitarReenvio?: boolean;
  createdAt: string;
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
