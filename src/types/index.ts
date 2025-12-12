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
  codigoPdv?: string;
  createdAt: string;
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
  createdAt: string;
}

export interface DashboardStats {
  emAberto: number;
  encerrados: number;
  totalProtocolos: number;
  totalMotoristas: number;
}
