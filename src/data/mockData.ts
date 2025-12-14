import { Motorista, Protocolo, DashboardStats, RankingItem, Unidade } from '@/types';

export const mockUnidades: Unidade[] = [
  { id: '1', nome: 'Revalle Juazeiro', codigo: 'JUA', cnpj: '04.690.106/0001-15', createdAt: '2024-01-01' },
  { id: '2', nome: 'Revalle Bonfim', codigo: 'BON', cnpj: '04.690.106/0003-87', createdAt: '2024-01-01' },
  { id: '3', nome: 'Revalle Petrolina', codigo: 'PET', cnpj: '07.717.961/0001-60', createdAt: '2024-01-01' },
  { id: '4', nome: 'Revalle Ribeira do Pombal', codigo: 'RDP', cnpj: '28.098.474/0001-37', createdAt: '2024-01-01' },
  { id: '5', nome: 'Revalle Paulo Afonso', codigo: 'PAF', cnpj: '28.098.474/0002-18', createdAt: '2024-01-01' },
  { id: '6', nome: 'Revalle Alagoinhas', codigo: 'ALA', cnpj: '54.677.520/0001-62', createdAt: '2024-01-01' },
  { id: '7', nome: 'Revalle Serrinha', codigo: 'SER', cnpj: '54.677.520/0002-43', createdAt: '2024-01-01' },
];

export const mockMotoristas: Motorista[] = [
  {
    id: '1',
    nome: 'Carlos Silva',
    codigo: '60121',
    dataNascimento: '1985-03-15',
    unidade: 'Revalle Alagoinhas',
    funcao: 'motorista',
    setor: 'sede',
    email: 'carlos.silva@revalle.com',
    senha: '123456',
    createdAt: '2024-01-10'
  },
  {
    id: '2',
    nome: 'José Santos',
    codigo: '60122',
    dataNascimento: '1990-07-22',
    unidade: 'Revalle Juazeiro',
    funcao: 'motorista',
    setor: 'interior',
    email: 'jose.santos@revalle.com',
    senha: '123456',
    createdAt: '2024-01-12'
  },
  {
    id: '3',
    nome: 'Marcos Oliveira',
    codigo: '60123',
    dataNascimento: '1988-11-08',
    unidade: 'Revalle Petrolina',
    funcao: 'ajudante_entrega',
    setor: 'sede',
    email: 'marcos.oliveira@revalle.com',
    senha: '123456',
    createdAt: '2024-01-15'
  },
  {
    id: '4',
    nome: 'Roberto Almeida',
    codigo: '60124',
    dataNascimento: '1992-05-30',
    unidade: 'Revalle Alagoinhas',
    funcao: 'ajudante_entrega',
    setor: 'interior',
    email: 'roberto.almeida@revalle.com',
    senha: '123456',
    createdAt: '2024-01-18'
  },
];

export const mockProtocolos: Protocolo[] = [
  {
    id: '1',
    numero: 'PROTOC-20251121-2506c1',
    motorista: mockMotoristas[0],
    data: '21/11/2025',
    hora: '15:36:21',
    sla: '4h',
    status: 'aberto',
    validacao: true,
    lancado: true,
    enviadoLancar: true,
    enviadoEncerrar: false,
    tipoReposicao: 'AVARIA',
    causa: 'AVARIADA NA ROTA',
    unidadeId: 1,
    unidadeNome: 'Revalle Alagoinhas',
    mapa: '16431',
    notaFiscal: '243631',
    produtos: [
      {
        codigo: '7325',
        nome: 'PEPSI COLA PET 1L CAIXA C/12 (UN)',
        unidade: 'UND',
        quantidade: 1,
        validade: '16/03/2026'
      }
    ],
    fotos: [
      'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=200',
      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200'
    ],
    historicoObservacoes: [
      {
        id: '1',
        data: '21/11/2025',
        hora: '16:12',
        texto: 'Produto avariado nas laterais.'
      }
    ],
    createdAt: '2025-11-21T15:36:21'
  },
  {
    id: '2',
    numero: 'PROTOC-20251210-3507b2',
    motorista: mockMotoristas[1],
    data: '10/12/2025',
    hora: '09:15:00',
    sla: '2h',
    status: 'em_andamento',
    validacao: true,
    lancado: true,
    enviadoLancar: true,
    enviadoEncerrar: false,
    tipoReposicao: 'VENCIMENTO',
    causa: 'PRODUTO PRÓXIMO AO VENCIMENTO',
    unidadeId: 2,
    unidadeNome: 'Revalle Juazeiro',
    mapa: '16432',
    notaFiscal: '243632',
    produtos: [
      {
        codigo: '7326',
        nome: 'GUARANÁ ANTARCTICA PET 2L CAIXA C/6',
        unidade: 'CX',
        quantidade: 2,
        validade: '20/12/2025'
      },
      {
        codigo: '7327',
        nome: 'SUKITA LARANJA PET 2L CAIXA C/6',
        unidade: 'CX',
        quantidade: 1,
        validade: '22/12/2025'
      }
    ],
    fotos: [
      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200'
    ],
    historicoObservacoes: [
      {
        id: '1',
        data: '10/12/2025',
        hora: '09:30',
        texto: 'Produtos com validade próxima, necessita reposição urgente.'
      }
    ],
    createdAt: '2025-12-10T09:15:00'
  },
  {
    id: '3',
    numero: 'PROTOC-20251209-4508c3',
    motorista: mockMotoristas[2],
    data: '09/12/2025',
    hora: '14:00:00',
    sla: '4h',
    status: 'encerrado',
    validacao: true,
    lancado: true,
    enviadoLancar: true,
    enviadoEncerrar: true,
    tipoReposicao: 'FALTA',
    causa: 'PRODUTO EM FALTA NO PDV',
    unidadeId: 3,
    unidadeNome: 'Revalle Petrolina',
    codigoPdv: 'PDV003',
    mapa: '16433',
    notaFiscal: '243633',
    produtos: [
      {
        codigo: '7328',
        nome: 'COCA-COLA PET 2L CAIXA C/6',
        unidade: 'CX',
        quantidade: 5,
        validade: '15/06/2026'
      }
    ],
    historicoObservacoes: [
      {
        id: '1',
        data: '09/12/2025',
        hora: '14:30',
        texto: 'Reposição realizada com sucesso.'
      },
      {
        id: '2',
        data: '09/12/2025',
        hora: '16:00',
        texto: 'Protocolo encerrado.'
      }
    ],
    createdAt: '2025-12-09T14:00:00'
  },
  {
    id: '4',
    numero: 'PROTOC-20251211-5509d4',
    motorista: mockMotoristas[3],
    data: '11/12/2025',
    hora: '07:45:00',
    sla: '6h',
    status: 'aberto',
    validacao: false,
    lancado: false,
    enviadoLancar: false,
    enviadoEncerrar: false,
    tipoReposicao: 'TROCA',
    causa: 'TROCA DE PRODUTO',
    unidadeId: 1,
    unidadeNome: 'Revalle Alagoinhas',
    codigoPdv: 'PDV004',
    mapa: '16434',
    notaFiscal: '243634',
    produtos: [
      {
        codigo: '7329',
        nome: 'FANTA LARANJA PET 2L CAIXA C/6',
        unidade: 'CX',
        quantidade: 3,
        validade: '10/05/2026'
      }
    ],
    createdAt: '2025-12-11T07:45:00'
  },
  {
    id: '5',
    numero: 'PROTOC-20251208-6510e5',
    motorista: mockMotoristas[0],
    data: '08/12/2025',
    hora: '10:30:00',
    sla: '4h',
    status: 'encerrado',
    validacao: true,
    lancado: true,
    enviadoLancar: true,
    enviadoEncerrar: true,
    tipoReposicao: 'AVARIA',
    causa: 'AVARIADA NO TRANSPORTE',
    unidadeId: 1,
    unidadeNome: 'Revalle Alagoinhas',
    codigoPdv: 'PDV001',
    mapa: '16435',
    notaFiscal: '243635',
    produtos: [
      {
        codigo: '7330',
        nome: 'SPRITE PET 2L CAIXA C/6',
        unidade: 'CX',
        quantidade: 2,
        validade: '20/04/2026'
      }
    ],
    historicoObservacoes: [
      {
        id: '1',
        data: '08/12/2025',
        hora: '11:00',
        texto: 'Caixa danificada durante transporte.'
      },
      {
        id: '2',
        data: '08/12/2025',
        hora: '14:00',
        texto: 'Reposição concluída.'
      }
    ],
    createdAt: '2025-12-08T10:30:00'
  },
];

export const mockStats: DashboardStats = {
  emAberto: 2,
  encerrados: 2,
  totalProtocolos: 5,
  totalMotoristas: 4,
  totalHoje: 3,
};

export const topMotoristas: RankingItem[] = [
  { id: '1', nome: 'Carlos Silva', quantidade: 15 },
  { id: '2', nome: 'José Santos', quantidade: 12 },
  { id: '3', nome: 'Marcos Oliveira', quantidade: 10 },
  { id: '4', nome: 'Roberto Almeida', quantidade: 8 },
  { id: '5', nome: 'Fernando Costa', quantidade: 6 },
];

export const topClientes: RankingItem[] = [
  { id: '1', nome: 'Supermercado Extra', quantidade: 18 },
  { id: '2', nome: 'Mercado São João', quantidade: 14 },
  { id: '3', nome: 'Loja Americana', quantidade: 11 },
  { id: '4', nome: 'Atacadão', quantidade: 9 },
  { id: '5', nome: 'Assaí Atacadista', quantidade: 7 },
];

export const topProdutos: RankingItem[] = [
  { id: '1', nome: 'PEPSI COLA PET 2L', quantidade: 25 },
  { id: '2', nome: 'GUARANÁ ANTARCTICA 2L', quantidade: 20 },
  { id: '3', nome: 'COCA-COLA PET 2L', quantidade: 18 },
  { id: '4', nome: 'SUKITA LARANJA 2L', quantidade: 12 },
  { id: '5', nome: 'FANTA LARANJA 2L', quantidade: 10 },
];

export const unidades = mockUnidades.map(u => u.nome);
