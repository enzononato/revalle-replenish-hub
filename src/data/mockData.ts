import { Motorista, Protocolo, DashboardStats } from '@/types';

export const mockMotoristas: Motorista[] = [
  {
    id: '1',
    nome: 'Carlos Silva',
    codigo: 'MOT001',
    dataNascimento: '1985-03-15',
    unidade: 'Matriz',
    whatsapp: '11999998888',
    codigoPdv: 'PDV001',
    createdAt: '2024-01-10'
  },
  {
    id: '2',
    nome: 'José Santos',
    codigo: 'MOT002',
    dataNascimento: '1990-07-22',
    unidade: 'Filial 01',
    whatsapp: '11988887777',
    codigoPdv: 'PDV002',
    createdAt: '2024-01-12'
  },
  {
    id: '3',
    nome: 'Marcos Oliveira',
    codigo: 'MOT003',
    dataNascimento: '1988-11-08',
    unidade: 'Filial 02',
    whatsapp: '11977776666',
    createdAt: '2024-01-15'
  },
  {
    id: '4',
    nome: 'Roberto Almeida',
    codigo: 'MOT004',
    dataNascimento: '1992-05-30',
    unidade: 'Matriz',
    whatsapp: '11966665555',
    codigoPdv: 'PDV004',
    createdAt: '2024-01-18'
  },
];

export const mockProtocolos: Protocolo[] = [
  {
    id: '1',
    numero: 'PROT-2024-001',
    motorista: mockMotoristas[0],
    data: '2024-12-10',
    hora: '08:30',
    sla: '4h',
    status: 'aberto',
    validacao: false,
    lancado: false,
    enviadoLancar: true,
    enviadoEncerrar: false,
    createdAt: '2024-12-10T08:30:00'
  },
  {
    id: '2',
    numero: 'PROT-2024-002',
    motorista: mockMotoristas[1],
    data: '2024-12-10',
    hora: '09:15',
    sla: '2h',
    status: 'em_andamento',
    validacao: true,
    lancado: true,
    enviadoLancar: true,
    enviadoEncerrar: false,
    createdAt: '2024-12-10T09:15:00'
  },
  {
    id: '3',
    numero: 'PROT-2024-003',
    motorista: mockMotoristas[2],
    data: '2024-12-09',
    hora: '14:00',
    sla: '4h',
    status: 'encerrado',
    validacao: true,
    lancado: true,
    enviadoLancar: true,
    enviadoEncerrar: true,
    createdAt: '2024-12-09T14:00:00'
  },
  {
    id: '4',
    numero: 'PROT-2024-004',
    motorista: mockMotoristas[3],
    data: '2024-12-11',
    hora: '07:45',
    sla: '6h',
    status: 'aberto',
    validacao: false,
    lancado: false,
    enviadoLancar: false,
    enviadoEncerrar: false,
    createdAt: '2024-12-11T07:45:00'
  },
  {
    id: '5',
    numero: 'PROT-2024-005',
    motorista: mockMotoristas[0],
    data: '2024-12-08',
    hora: '10:30',
    sla: '4h',
    status: 'encerrado',
    validacao: true,
    lancado: true,
    enviadoLancar: true,
    enviadoEncerrar: true,
    createdAt: '2024-12-08T10:30:00'
  },
];

export const mockStats: DashboardStats = {
  emAberto: 2,
  encerrados: 2,
  totalProtocolos: 5,
  totalMotoristas: 4,
};

export const unidades = ['Matriz', 'Filial 01', 'Filial 02', 'Filial 03'];
