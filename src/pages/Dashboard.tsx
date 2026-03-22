import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '@/components/ui/StatCard';
import { RankingCard } from '@/components/ui/RankingCard';
import { AlertCard } from '@/components/ui/AlertCard';
import { useUnidadesDB } from '@/hooks/useUnidadesDB';
import { useGestoresDB } from '@/hooks/useGestoresDB';
import { MultiSelectUnidade } from '@/components/ui/MultiSelectUnidade';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMotoristasDB } from '@/hooks/useMotoristasDB';
import { FileText, CheckCircle, Clock, Truck, Calendar, Users, Building2, Package, Download, Eye, TrendingUp, MapPin, CalendarRange, X, RefreshCw, Repeat, AlertTriangle, PackageX, Timer, Warehouse } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, isToday, parseISO, differenceInHours, differenceInDays, subDays, subMonths, startOfMonth, endOfMonth, parse, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  LineChart,
  Line,
  Pie,
  Cell,
  Legend,
  LabelList
} from 'recharts';
import { ObservacaoLog } from '@/types';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

// Helper to safely get observacoesLog as array (handles JSON string or non-array)
const safeObsLog = (logs: unknown): ObservacaoLog[] => {
  if (Array.isArray(logs)) return logs;
  if (typeof logs === 'string') {
    try { const parsed = JSON.parse(logs); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
};

// Helper to parse dates in both dd/MM/yyyy and yyyy-MM-dd formats
const parseFlexDate = (dateStr: string): Date => {
  return dateStr.includes('-') 
    ? parse(dateStr, 'yyyy-MM-dd', new Date()) 
    : parse(dateStr, 'dd/MM/yyyy', new Date());
};


const COLORS = ['hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(160, 84%, 39%)'];

type PeriodoFiltro = 'hoje' | 'semana' | 'mes' | 'todos' | 'custom';

export default function Dashboard() {
  const { protocolos } = useProtocolos();
  const { isAdmin, user } = useAuth();
  const { motoristas } = useMotoristasDB();
  const { unidades } = useUnidadesDB();
  const { gestores } = useGestoresDB();
  const [unidadesFiltro, setUnidadesFiltro] = useState<string[]>([]);
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>('todos');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [chartPeriodo, setChartPeriodo] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [sobrasStats, setSobrasStats] = useState({ total: 0, pendente: 0, tratamento: 0, resolvido: 0, erroCarregamento: 0, erroEntrega: 0 });

  // Protocolos filtrados por unidade e período
  const protocolosFiltrados = useMemo(() => {
    let filtered = protocolos.filter(p => !p.oculto && p.tipoReposicao !== 'pos_rota');
    
    if (!isAdmin) {
      const userUnidades = user?.unidade?.split(',').map(u => u.trim()) || [];
      if (unidadesFiltro.length > 0) {
        filtered = filtered.filter(p => unidadesFiltro.includes(p.unidadeNome) && userUnidades.includes(p.unidadeNome));
      } else {
        filtered = filtered.filter(p => userUnidades.includes(p.unidadeNome));
      }
    } else if (unidadesFiltro.length > 0) {
      filtered = filtered.filter(p => unidadesFiltro.includes(p.unidadeNome));
    }

    // Filtro por período
    if (periodoFiltro === 'custom' && dateRange?.from) {
      filtered = filtered.filter(p => {
        try {
          const dataProtocolo = parseISO(p.createdAt);
          const from = startOfDay(dateRange.from!);
          const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
          return isWithinInterval(dataProtocolo, { start: from, end: to });
        } catch {
          return true;
        }
      });
    } else if (periodoFiltro !== 'todos') {
      const now = new Date();
      filtered = filtered.filter(p => {
        try {
          const dataProtocolo = parseISO(p.createdAt);
          switch (periodoFiltro) {
            case 'hoje':
              return isToday(dataProtocolo);
            case 'semana':
              return dataProtocolo >= subDays(now, 7);
            case 'mes':
              return dataProtocolo >= subDays(now, 30);
            default:
              return true;
          }
        } catch {
          return true;
        }
      });
    }
    
    return filtered;
  }, [protocolos, isAdmin, user?.unidade, unidadesFiltro, periodoFiltro, dateRange]);

  // Total de motoristas do banco de dados (filtrado por unidade)
  const totalMotoristasBase = useMemo(() => {
    if (!isAdmin) {
      const userUnidades = user?.unidade?.split(',').map(u => u.trim()) || [];
      if (unidadesFiltro.length > 0) {
        return motoristas.filter(m => unidadesFiltro.includes(m.unidade) && userUnidades.includes(m.unidade)).length;
      }
      return motoristas.filter(m => userUnidades.includes(m.unidade)).length;
    }
    if (unidadesFiltro.length > 0) {
      return motoristas.filter(m => unidadesFiltro.includes(m.unidade)).length;
    }
    return motoristas.length;
  }, [motoristas, isAdmin, user?.unidade, unidadesFiltro]);

  // Contador de motoristas por unidade (apenas para admin)
  const motoristasPorUnidade = useMemo(() => {
    const contagem: Record<string, number> = {};
    motoristas.forEach(m => {
      contagem[m.unidade] = (contagem[m.unidade] || 0) + 1;
    });
    return Object.entries(contagem)
      .map(([nome, quantidade]) => ({ id: nome, nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [motoristas]);

  // Estatísticas dinâmicas
  const stats = useMemo(() => {
    const emAberto = protocolosFiltrados.filter(p => p.status === 'aberto').length;
    const emAndamento = protocolosFiltrados.filter(p => p.status === 'em_andamento').length;
    const encerrados = protocolosFiltrados.filter(p => p.status === 'encerrado').length;
    const totalProtocolos = protocolosFiltrados.length;
    
    const totalHoje = protocolosFiltrados.filter(p => {
      try {
        const dataProtocolo = parseFlexDate(p.data);
        return isToday(dataProtocolo);
      } catch {
        return false;
      }
    }).length;

    // Calcular tendência (comparar com ontem)
    const ontem = subDays(new Date(), 1);
    const totalOntem = protocolosFiltrados.filter(p => {
      try {
        const dataProtocolo = parseFlexDate(p.data);
        return format(dataProtocolo, 'yyyy-MM-dd') === format(ontem, 'yyyy-MM-dd');
      } catch {
        return false;
      }
    }).length;

    const tendenciaHoje = totalOntem > 0 
      ? Math.round(((totalHoje - totalOntem) / totalOntem) * 100) 
      : totalHoje > 0 ? 100 : 0;

    return { emAberto, emAndamento, encerrados, totalProtocolos, totalHoje, tendenciaHoje };
  }, [protocolosFiltrados]);

  // Alertas - respeitando regra SLA (verde <12h, amarelo 12-24h, vermelho >24h)
  const alertas = useMemo(() => {
    const now = new Date();
    const dismissedKey = `dismissed_alerts_${format(now, 'yyyy-MM-dd')}`;
    const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]') as string[];
    
    const alerts: { id: string; titulo: string; descricao: string; tipo: 'critico' | 'atencao' | 'recente'; protocoloNumero: string }[] = [];
    
    protocolosFiltrados.forEach(p => {
      if (p.status !== 'encerrado' && !dismissed.includes(p.id)) {
        try {
          const horasDiff = differenceInHours(now, parseISO(p.createdAt));
          const slaHoras = parseInt(p.sla) || horasDiff;
          
          // 🔴 Crítico: SLA >= 24h
          if (slaHoras >= 24) {
            alerts.push({
              id: p.id,
              titulo: `Protocolo ${p.numero}`,
              descricao: `SLA ${slaHoras}h - ${p.motorista.nome}`,
              tipo: 'critico',
              protocoloNumero: p.numero
            });
          } 
          // 🟡 Atenção: SLA 12-24h
          else if (slaHoras >= 12) {
            alerts.push({
              id: p.id,
              titulo: `Protocolo ${p.numero}`,
              descricao: `SLA ${slaHoras}h - ${p.motorista.nome}`,
              tipo: 'atencao',
              protocoloNumero: p.numero
            });
          } 
          // 🆕 Recente: Criado há menos de 1h (para verificação)
          else if (horasDiff < 1) {
            alerts.push({
              id: p.id,
              titulo: `Protocolo ${p.numero}`,
              descricao: `Recém-criado - Verificar ${p.motorista.nome}`,
              tipo: 'recente',
              protocoloNumero: p.numero
            });
          }
        } catch {
          // ignore
        }
      }
    });
    
    // Ordenar: críticos primeiro, depois atenção, depois recentes
    return alerts.sort((a, b) => {
      const ordem = { critico: 0, atencao: 1, recente: 2 };
      return ordem[a.tipo] - ordem[b.tipo];
    });
  }, [protocolosFiltrados]);

  // Dados do gráfico de pizza
  const pieData = useMemo(() => [
    { name: 'Abertos', value: stats.emAberto },
    { name: 'Em Andamento', value: stats.emAndamento },
    { name: 'Encerrados', value: stats.encerrados },
  ], [stats]);

  // Dados do gráfico de barras (dinâmico por período)
  const barData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const today = new Date();
    const result = [];

    if (chartPeriodo === 'dia') {
      // Últimas 24h em blocos de 4h
      for (let i = 5; i >= 0; i--) {
        const hourStart = new Date(today);
        hourStart.setHours(today.getHours() - i * 4, 0, 0, 0);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hourStart.getHours() + 4);
        const label = `${format(hourStart, 'HH')}h`;
        
        const abertos = protocolosFiltrados.filter(p => {
          try {
            const dataProtocolo = parseFlexDate(p.data);
            if (!isToday(dataProtocolo)) return false;
            const [h] = p.hora.split(':').map(Number);
            return h >= hourStart.getHours() && h < hourEnd.getHours();
          } catch { return false; }
        }).length;

        result.push({ name: label, abertos, encerrados: 0 });
      }
    } else if (chartPeriodo === 'semana') {
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dayName = days[date.getDay()];
        const targetDateStr = format(date, 'yyyy-MM-dd');
        
        const abertosNoDia = protocolosFiltrados.filter(p => {
          try {
            const d = parseFlexDate(p.data);
            return format(d, 'yyyy-MM-dd') === targetDateStr;
          } catch { return false; }
        }).length;
        const encerradosNoDia = protocolosFiltrados.filter(p => {
          if (p.status !== 'encerrado') return false;
          const logEnc = safeObsLog(p.observacoesLog).find(l => l.acao?.startsWith('Encerrou o protocolo'));
          if (!logEnc?.data) return false;
          try {
            const d = parseFlexDate(logEnc.data);
            return format(d, 'yyyy-MM-dd') === targetDateStr;
          } catch { return false; }
        }).length;
        
        result.push({ name: `${dayName} ${format(date, 'dd')}`, abertos: abertosNoDia, encerrados: encerradosNoDia });
      }
    } else {
      // Últimos 4 meses
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      for (let i = 3; i >= 0; i--) {
        const monthDate = subMonths(today, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const label = monthNames[monthDate.getMonth()];
        
        const abertos = protocolosFiltrados.filter(p => {
          try {
            const d = parseFlexDate(p.data);
            return d >= monthStart && d <= monthEnd;
          } catch { return false; }
        }).length;
        
        const encerrados = protocolosFiltrados.filter(p => {
          if (p.status !== 'encerrado') return false;
          const logEnc = safeObsLog(p.observacoesLog).find(l => l.acao?.startsWith('Encerrou o protocolo'));
          if (!logEnc?.data) return false;
          try {
            const d = parseFlexDate(logEnc.data);
            return d >= monthStart && d <= monthEnd;
          } catch { return false; }
        }).length;
        
        result.push({ name: label, abertos, encerrados });
      }
    }
    
    return result;
  }, [protocolosFiltrados, chartPeriodo]);

  // Protocolos recentes
  const recentProtocolos = useMemo(() => 
    protocolosFiltrados.slice(0, 5),
  [protocolosFiltrados]);

  // TOP 5 Motoristas (calculado dos protocolos reais)
  const topMotoristasReal = useMemo(() => {
    const contagem: Record<string, number> = {};
    protocolosFiltrados.forEach(p => {
      const nome = p.motorista.nome;
      contagem[nome] = (contagem[nome] || 0) + 1;
    });
    return Object.entries(contagem)
      .map(([nome, quantidade], index) => ({ id: `motorista-${index}`, nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [protocolosFiltrados]);

  // Mapa de código PDV -> nome PDV
  const [pdvNamesMap, setPdvNamesMap] = useState<Record<string, string>>({});

  // Buscar nomes dos PDVs do banco (em lotes para evitar limite)
  useEffect(() => {
    const codigos = [...new Set(protocolosFiltrados.map(p => p.codigoPdv).filter(Boolean))] as string[];
    if (codigos.length === 0) return;

    const fetchPdvNames = async () => {
      const map: Record<string, string> = {};
      const batchSize = 200;
      for (let i = 0; i < codigos.length; i += batchSize) {
        const batch = codigos.slice(i, i + batchSize);
        const { data } = await supabase
          .from('pdvs')
          .select('codigo, nome')
          .in('codigo', batch);
        if (data) {
          data.forEach(p => { map[p.codigo] = p.nome; });
        }
      }
      setPdvNamesMap(map);
    };
    fetchPdvNames();
  }, [protocolosFiltrados]);

  // Fetch sobras stats from database
  useEffect(() => {
    const fetchSobrasStats = async () => {
      try {
        let baseQuery = supabase
          .from('protocolos')
          .select('status, causa, motorista_unidade')
          .eq('tipo_reposicao', 'pos_rota')
          .eq('ativo', true);

        const { data, error } = await baseQuery;
        if (error) throw error;

        let filtered = data || [];
        
        // Apply unit filter
        if (!isAdmin) {
          const userUnidades = user?.unidade?.split(',').map(u => u.trim()) || [];
          if (unidadesFiltro.length > 0) {
            filtered = filtered.filter(s => s.motorista_unidade && unidadesFiltro.includes(s.motorista_unidade) && userUnidades.includes(s.motorista_unidade));
          } else {
            filtered = filtered.filter(s => s.motorista_unidade && userUnidades.includes(s.motorista_unidade));
          }
        } else if (unidadesFiltro.length > 0) {
          filtered = filtered.filter(s => s.motorista_unidade && unidadesFiltro.includes(s.motorista_unidade));
        }

        setSobrasStats({
          total: filtered.length,
          pendente: filtered.filter(s => s.status === 'aberto').length,
          tratamento: filtered.filter(s => s.status === 'em_andamento').length,
          resolvido: filtered.filter(s => s.status === 'encerrado').length,
          erroCarregamento: filtered.filter(s => s.causa?.toUpperCase().includes('ERRO DE CARREGAMENTO')).length,
          erroEntrega: filtered.filter(s => s.causa?.toUpperCase().includes('ERRO DE ENTREGA')).length,
        });
      } catch (err) {
        console.error('Erro ao buscar sobras stats:', err);
      }
    };
    fetchSobrasStats();
  }, [isAdmin, user?.unidade, unidadesFiltro]);

  // TOP 5 Clientes PDVs (calculado dos protocolos reais)
  const topClientesReal = useMemo(() => {
    const contagem: Record<string, number> = {};
    protocolosFiltrados.forEach(p => {
      const pdv = p.codigoPdv || 'Sem PDV';
      contagem[pdv] = (contagem[pdv] || 0) + 1;
    });
    return Object.entries(contagem)
      .map(([codigo, quantidade], index) => ({
        id: `pdv-${index}`,
        nome: pdvNamesMap[codigo] || codigo,
        quantidade
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [protocolosFiltrados, pdvNamesMap]);

  // TOP 5 Produtos (calculado dos protocolos reais)
  const topProdutosReal = useMemo(() => {
    const contagem: Record<string, number> = {};
    protocolosFiltrados.forEach(p => {
      p.produtos?.forEach(prod => {
        contagem[prod.nome] = (contagem[prod.nome] || 0) + Number(prod.quantidade);
      });
    });
    return Object.entries(contagem)
      .map(([nome, quantidade], index) => ({ id: `produto-${index}`, nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [protocolosFiltrados]);

  // ===== NOVOS GRÁFICOS DE CRUZAMENTO =====

  // 1. Tipo de Reposição × Unidade (Barras Agrupadas - todas as unidades)
  const tipoXUnidadeData = useMemo(() => {
    // Inicializar com todas as unidades do sistema
    const map: Record<string, { unidade: string; inversao: number; avaria: number; falta: number }> = {};
    unidades.forEach(u => {
      map[u.nome] = { unidade: u.nome, inversao: 0, avaria: 0, falta: 0 };
    });
    // Contar de TODOS protocolos (sem filtro de unidade selecionada)
    const todosProtocolos = protocolos.filter(p => !p.oculto && p.tipoReposicao !== 'pos_rota');
    todosProtocolos.forEach(p => {
      const unidade = p.unidadeNome || 'Sem Unidade';
      if (!map[unidade]) map[unidade] = { unidade, inversao: 0, avaria: 0, falta: 0 };
      if (p.tipoReposicao === 'INVERSAO') map[unidade].inversao++;
      else if (p.tipoReposicao === 'AVARIA') map[unidade].avaria++;
      else if (p.tipoReposicao === 'FALTA') map[unidade].falta++;
    });
    return Object.values(map).sort((a, b) => a.unidade.localeCompare(b.unidade));
  }, [protocolos, unidades]);

  // 2. Motorista × Tipo de Reposição (Top 10 - Horizontal)
  const motoristaXTipoData = useMemo(() => {
    const map: Record<string, { motorista: string; inversao: number; avaria: number; falta: number; total: number }> = {};
    protocolosFiltrados.forEach(p => {
      const nome = p.motorista.nome;
      if (!map[nome]) map[nome] = { motorista: nome, inversao: 0, avaria: 0, falta: 0, total: 0 };
      if (p.tipoReposicao === 'INVERSAO') { map[nome].inversao++; map[nome].total++; }
      else if (p.tipoReposicao === 'AVARIA') { map[nome].avaria++; map[nome].total++; }
      else if (p.tipoReposicao === 'FALTA') { map[nome].falta++; map[nome].total++; }
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(item => ({
        ...item,
        // Truncar nome para caber no eixo Y
        motorista: item.motorista.length > 18 ? item.motorista.substring(0, 18) + '…' : item.motorista
      }));
  }, [protocolosFiltrados]);

  // 3. PDV × Frequência (Top 10 - Barras Horizontais)
  const pdvFrequenciaData = useMemo(() => {
    const map: Record<string, { codigo: string; nome: string; inversao: number; avaria: number; falta: number }> = {};
    protocolosFiltrados.forEach(p => {
      const cod = p.codigoPdv || 'Sem PDV';
      if (!map[cod]) map[cod] = { codigo: cod, nome: pdvNamesMap[cod] || cod, inversao: 0, avaria: 0, falta: 0 };
      if (p.tipoReposicao === 'INVERSAO') map[cod].inversao++;
      else if (p.tipoReposicao === 'AVARIA') map[cod].avaria++;
      else if (p.tipoReposicao === 'FALTA') map[cod].falta++;
    });
    return Object.values(map)
      .sort((a, b) => (b.inversao + b.avaria + b.falta) - (a.inversao + a.avaria + a.falta))
      .slice(0, 10);
  }, [protocolosFiltrados, pdvNamesMap]);

  // 4. Taxa de Resolução por Período (Linha Dupla - últimos 6 meses)
  const taxaResolucaoData = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const today = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const label = monthNames[monthDate.getMonth()];
      
      const abertos = protocolosFiltrados.filter(p => {
        try {
          const d = parseFlexDate(p.data);
          return d >= mStart && d <= mEnd;
        } catch { return false; }
      }).length;
      
      const encerrados = protocolosFiltrados.filter(p => {
        if (p.status !== 'encerrado') return false;
        const logEnc = safeObsLog(p.observacoesLog).find(l => l.acao?.startsWith('Encerrou o protocolo'));
        if (!logEnc?.data) return false;
        try {
          const d = parseFlexDate(logEnc.data);
          return d >= mStart && d <= mEnd;
        } catch { return false; }
      }).length;
      
      result.push({ name: label, abertos, encerrados });
    }
    return result;
  }, [protocolosFiltrados]);


  // Contagem por tipo de reposição
  const contagemPorTipo = useMemo(() => {
    const inversao = protocolosFiltrados.filter(p => p.tipoReposicao === 'INVERSAO').length;
    const avaria = protocolosFiltrados.filter(p => p.tipoReposicao === 'AVARIA').length;
    const falta = protocolosFiltrados.filter(p => p.tipoReposicao === 'FALTA').length;
    return { inversao, avaria, falta };
  }, [protocolosFiltrados]);

  // Saudação
  const saudacao = useMemo(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // Data atual
  const dataAtual = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  // Download CSV
  const handleDownloadCSV = () => {
    const headers = ['Protocolo', 'Motorista', 'Data', 'Hora', 'Status', 'SLA', 'Unidade'];
    const csvContent = [
      headers.join(';'),
      ...protocolosFiltrados.map(p => [
        p.numero,
        p.motorista.nome,
        p.data,
        p.hora,
        p.status,
        p.sla,
        p.unidadeNome || ''
      ].join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${protocolosFiltrados.length} protocolo(s) exportado(s)!`);
  };

  // Função para obter iniciais do nome
  const getInitials = (nome: string) => {
    return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  // Função para extrair data de encerramento do log
  const getDataEncerramentoFromLog = (observacoesLog?: ObservacaoLog[] | unknown): string | null => {
    const logs = safeObsLog(observacoesLog);
    const logEncerramento = logs.find(l => l.acao?.startsWith('Encerrou o protocolo'));
    return logEncerramento?.data || null;
  };

  // Função para cor do SLA - padronizada com página Protocolos (dias)
  // Função para cor do SLA - usando campo data (DD/MM/YYYY) para consistência com backend
  const calcularSlaDias = (dataStr: string, status?: string, observacoesLog?: ObservacaoLog[]): number => {
    try {
      const dataProtocolo = parseFlexDate(dataStr);
      if (isNaN(dataProtocolo.getTime())) return 0;
      
      if (status === 'encerrado') {
        const dataEncerramentoStr = getDataEncerramentoFromLog(observacoesLog);
        if (dataEncerramentoStr) {
          const dataEncerramento = parseFlexDate(dataEncerramentoStr);
          if (!isNaN(dataEncerramento.getTime())) {
            return differenceInDays(dataEncerramento, dataProtocolo);
          }
        }
      }
      
      return differenceInDays(new Date(), dataProtocolo);
    } catch {
      return 0;
    }
  };

  // Lead Time médio (dias) dos protocolos encerrados
  const leadTime = useMemo(() => {
    const encerrados = protocolosFiltrados.filter(p => p.status === 'encerrado');
    if (encerrados.length === 0) return '—';
    const totalDias = encerrados.reduce((acc, p) => {
      return acc + calcularSlaDias(p.data, p.status, p.observacoesLog);
    }, 0);
    return (totalDias / encerrados.length).toFixed(1);
  }, [protocolosFiltrados]);

  // Protocolos próximos de atingir 16 dias de SLA (13-15 dias)
  const protocolosProximosSLA = useMemo(() => {
    return protocolosFiltrados
      .filter(p => p.status !== 'encerrado')
      .map(p => {
        const slaDias = calcularSlaDias(p.data, p.status, p.observacoesLog);
        return { ...p, slaDias };
      })
      .filter(p => p.slaDias >= 13 && p.slaDias <= 15)
      .sort((a, b) => b.slaDias - a.slaDias);
  }, [protocolosFiltrados]);

  const getSlaColor = (dias: number): string => {
    if (dias >= 15) return 'text-foreground bg-red-300 dark:bg-red-500/30 dark:text-red-300';
    if (dias > 7) return 'text-foreground bg-amber-200 dark:bg-amber-500/30 dark:text-amber-300';
    return 'text-foreground bg-emerald-300 dark:bg-emerald-500/30 dark:text-emerald-300';
  };

  // Verificar se protocolo foi reaberto
  const foiReaberto = (observacoesLog?: ObservacaoLog[] | unknown): boolean => {
    return safeObsLog(observacoesLog).some(log => log.acao === 'Reabriu o protocolo');
  };

  // Cor para avatar baseado no nome
  const getAvatarColor = (nome: string) => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 
      'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500'
    ];
    const index = nome.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Helper para adicionar filtro de unidade nos links
  const buildHref = (basePath: string) => {
    if (unidadesFiltro.length === 0) return basePath;
    const separator = basePath.includes('?') ? '&' : '?';
    return `${basePath}${separator}unidade=${encodeURIComponent(unidadesFiltro.join(','))}`;
  };

  return (
    <div className="space-y-4">
      {/* Header Personalizado */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-2.5 border border-primary/20">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30">
                <TrendingUp size={14} />
              </div>
              <div>
                <h1 className="font-heading text-base sm:text-lg font-bold text-foreground">
                  {saudacao}, {user?.nome?.split(' ')[0] || 'Usuário'}!
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                  <span className="capitalize">{dataAtual}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="flex items-center gap-1">
                    <Building2 size={9} />
                    {isAdmin ? 'Todas as Unidades' : user?.unidade || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {/* Filtro de Período */}
            <Select value={periodoFiltro} onValueChange={(v) => {
              setPeriodoFiltro(v as PeriodoFiltro);
              if (v !== 'custom') {
                setDateRange(undefined);
              }
            }}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-background/80 backdrop-blur-sm">
                <Calendar size={14} className="mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Última Semana</SelectItem>
                <SelectItem value="mes">Último Mês</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            {periodoFiltro === 'custom' && (
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs bg-background/80 backdrop-blur-sm justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarRange size={14} className="mr-1.5" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy")
                      )
                    ) : (
                      <span>Selecionar datas</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      if (range?.from && range?.to) {
                        setIsDatePickerOpen(false);
                      }
                    }}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Clear date filter */}
            {periodoFiltro === 'custom' && dateRange?.from && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setDateRange(undefined);
                  setPeriodoFiltro('todos');
                }}
              >
                <X size={14} />
              </Button>
            )}

            {/* Filtro Multi-Unidade */}
            {(() => {
              const unidadesDisponiveis = isAdmin 
                ? unidades 
                : unidades.filter(u => {
                    const userUnidades = user?.unidade?.split(',').map(s => s.trim()) || [];
                    return userUnidades.includes(u.nome);
                  });
              return unidadesDisponiveis.length > 1 ? (
                <MultiSelectUnidade
                  unidades={unidadesDisponiveis}
                  selected={unidadesFiltro}
                  onChange={setUnidadesFiltro}
                  triggerClassName="w-[180px]"
                />
              ) : null;
            })()}
            <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="h-8 text-xs bg-background/80 backdrop-blur-sm">
              <Download size={14} className="mr-1.5" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div data-tour="dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          title="Em Aberto"
          value={stats.emAberto}
          icon={Clock}
          variant="warning"
          delay={0}
          href={buildHref("/protocolos?status=aberto")}
        />
        <StatCard
          title="Encerrados Hoje"
          value={protocolosFiltrados.filter(p => p.status === 'encerrado' && (() => {
            try {
              const dataEnc = getDataEncerramentoFromLog(p.observacoesLog);
              if (dataEnc) {
                const parsed = parseFlexDate(dataEnc);
                return isToday(parsed);
              }
              return false;
            } catch { return false; }
          })()).length}
          icon={CheckCircle}
          variant="success"
          delay={100}
          href={buildHref("/protocolos?status=encerrado&periodo=hoje")}
        />
        <StatCard
          title="Total de Protocolos"
          value={stats.totalProtocolos}
          icon={FileText}
          variant="primary"
          delay={200}
          href={buildHref("/protocolos")}
        />
        <StatCard
          title="Total de Motoristas"
          value={totalMotoristasBase}
          icon={Truck}
          variant="info"
          delay={300}
          href={buildHref("/motoristas")}
        />
        <StatCard
          title="Total Hoje"
          value={stats.totalHoje}
          icon={Calendar}
          variant="info"
          delay={400}
          href={buildHref("/protocolos?periodo=hoje")}
        />
        <StatCard
          title="Lead Time"
          value={leadTime === '—' ? '—' : `${leadTime} dias`}
          icon={Timer}
          variant="default"
          delay={500}
        />
      
      </div>

      {/* Estatísticas por Tipo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Inversão"
          value={contagemPorTipo.inversao}
          icon={Repeat}
          variant="info"
          delay={450}
          href={buildHref("/protocolos?tipo=INVERSAO&status=todos")}
        />
        <StatCard
          title="Avaria"
          value={contagemPorTipo.avaria}
          icon={AlertTriangle}
          variant="warning"
          delay={475}
          href={buildHref("/protocolos?tipo=AVARIA&status=todos")}
        />
        <StatCard
          title="Falta"
          value={contagemPorTipo.falta}
          icon={PackageX}
          variant="primary"
          delay={500}
          href={buildHref("/protocolos?tipo=FALTA&status=todos")}
        />
        <StatCard
          title="Sobras"
          value={sobrasStats.total}
          icon={Warehouse}
          variant="default"
          delay={525}
          href={buildHref("/sobras")}
        />
      </div>

      {/* Rankings + Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RankingCard
          title="Top 5 Motoristas"
          icon={<Users className="text-primary" size={18} />}
          items={topMotoristasReal}
          delay={500}
          variant="primary"
        />
        <RankingCard
          title="Top 5 Clientes (PDVs)"
          icon={<Building2 className="text-sky-500" size={18} />}
          items={topClientesReal}
          delay={600}
          variant="info"
        />
        <RankingCard
          title="Top 5 Produtos"
          icon={<Package className="text-emerald-500" size={18} />}
          items={topProdutosReal}
          delay={700}
          variant="success"
        />
        <AlertCard
          items={alertas}
          delay={800}
        />
      </div>

      {/* Protocolos Próximos do SLA 16 dias */}
      {protocolosProximosSLA.length > 0 && (
        <div className="card-stats animate-slide-up border-l-4 border-l-amber-500" style={{ animationDelay: '850ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <Timer className="text-amber-500" size={16} />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold">⚠️ Protocolos Próximos do SLA 16 dias</h3>
              <p className="text-xs text-muted-foreground">Estes protocolos atingirão 16 dias em breve e dispararão alerta automático</p>
            </div>
          </div>
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="table-header bg-amber-500/10">
                  <th className="text-left p-2 text-[10px] rounded-tl-lg">Protocolo</th>
                  <th className="text-left p-2 text-[10px]">Motorista</th>
                  <th className="text-left p-2 text-[10px]">Unidade</th>
                  <th className="text-left p-2 text-[10px]">Gestor</th>
                  <th className="text-left p-2 text-[10px]">Data</th>
                  <th className="text-left p-2 text-[10px]">Dias SLA</th>
                  <th className="text-left p-2 text-[10px]">Faltam</th>
                  <th className="text-left p-2 text-[10px]">Status</th>
                  <th className="text-right p-2 text-[10px] rounded-tr-lg">Ações</th>
                </tr>
              </thead>
              <tbody>
                {protocolosProximosSLA.map((protocolo) => {
                  const diasFaltando = 16 - protocolo.slaDias;
                  const unidadeProtocolo = protocolo.motorista?.unidade || '—';
                  const gestorResponsavel = gestores.find(g => 
                    g.unidades.some(u => u.toUpperCase().trim() === unidadeProtocolo.toUpperCase().trim())
                  );
                  
                  return (
                    <tr 
                      key={protocolo.id} 
                      className="border-b border-border hover:bg-amber-500/5 transition-all duration-200 group"
                    >
                      <td className="p-2">
                        <span className="font-semibold text-primary text-[11px]">{protocolo.numero}</span>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${getAvatarColor(protocolo.motorista.nome)}`}>
                            {getInitials(protocolo.motorista.nome)}
                          </div>
                          <span className="font-medium text-[11px]">{protocolo.motorista.nome}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className="text-[11px] font-medium">{unidadeProtocolo}</span>
                      </td>
                      <td className="p-2">
                        <span className="text-[11px] text-muted-foreground">
                          {gestorResponsavel ? gestorResponsavel.nome : '—'}
                        </span>
                      </td>
                      <td className="p-2 text-muted-foreground text-[11px]">{protocolo.data}</td>
                      <td className="p-2">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-200 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300">
                          {protocolo.slaDias} dias
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          diasFaltando === 1 
                            ? 'bg-red-200 text-red-800 dark:bg-red-500/30 dark:text-red-300' 
                            : 'bg-orange-200 text-orange-800 dark:bg-orange-500/30 dark:text-orange-300'
                        }`}>
                          {diasFaltando} {diasFaltando === 1 ? 'dia' : 'dias'}
                        </span>
                      </td>
                      <td className="p-2">
                        <StatusBadge status={protocolo.status} />
                      </td>
                      <td className="p-2 text-right">
                        <Link to={`/protocolos?id=${protocolo.id}`}>
                          <Button 
                            variant="outline" 
                            className="h-5 text-[11px] border-amber-500 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            <Eye size={11} className="mr-1" />
                            Ver
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Motoristas por Unidade - apenas para admin */}
      {isAdmin && motoristasPorUnidade.length > 0 && (
        <div className="card-stats animate-slide-up" style={{ animationDelay: '900ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="text-primary" size={16} />
            <h3 className="font-heading text-base font-semibold">Motoristas por Unidade</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {motoristasPorUnidade.map((item, index) => (
              <div 
                key={item.id}
                className="flex flex-col items-center p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                style={{ animationDelay: `${900 + index * 50}ms` }}
              >
                <span className="text-xl font-bold text-primary">{item.quantidade}</span>
                <span className="text-xs text-muted-foreground text-center truncate w-full">{item.nome}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <div className="card-stats animate-slide-up" style={{ animationDelay: '950ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-semibold">
              Protocolos {chartPeriodo === 'dia' ? 'de Hoje' : chartPeriodo === 'semana' ? 'da Semana' : 'do Mês'}
            </h3>
            <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
              {[
                { value: 'dia' as const, label: 'Dia' },
                { value: 'semana' as const, label: 'Semana' },
                { value: 'mes' as const, label: 'Mês' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setChartPeriodo(opt.value)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all",
                    chartPeriodo === opt.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barData} margin={{ top: 28, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.2))]} fontSize={11} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground capitalize">{value}</span>
                )}
              />
              <Bar dataKey="abertos" name="Abertos" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="abertos" position="top" offset={10} className="fill-muted-foreground text-[10px]" />
              </Bar>
              <Bar dataKey="encerrados" name="Encerrados" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="encerrados" position="top" offset={10} className="fill-muted-foreground text-[10px]" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card-stats animate-slide-up" style={{ animationDelay: '1000ms' }}>
          <h3 className="font-heading text-base font-semibold mb-4">Status dos Protocolos</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                label={({ cx, cy, midAngle, outerRadius, name, value, percent }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius + 28;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  if (value === 0) return null;
                  return (
                    <text
                      x={x}
                      y={y}
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      className="fill-foreground"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {`${value} (${(percent * 100).toFixed(0)}%)`}
                    </text>
                  );
                }}
                labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [`${value} protocolos`, name]}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: '12px' }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground font-medium">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos de Cruzamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Tipo de Reposição × Unidade */}
        <div className="card-stats animate-slide-up" style={{ animationDelay: '1050ms' }}>
          <h3 className="font-heading text-base font-semibold mb-4">Tipo de Reposição por Unidade</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tipoXUnidadeData} margin={{ top: 20, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="unidade" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(value) => <span className="text-xs text-muted-foreground capitalize">{value}</span>} />
              <Bar dataKey="inversao" name="Inversão" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avaria" name="Avaria" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="falta" name="Falta" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 2. Motorista × Tipo de Reposição (Horizontal) */}
        <div className="card-stats animate-slide-up" style={{ animationDelay: '1100ms' }}>
          <h3 className="font-heading text-base font-semibold mb-4">Top 10 Motoristas por Tipo</h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={motoristaXTipoData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" allowDecimals={false} fontSize={11} />
              <YAxis type="category" dataKey="motorista" stroke="hsl(var(--muted-foreground))" fontSize={10} width={130} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(value) => <span className="text-xs text-muted-foreground capitalize">{value}</span>} />
              <Bar dataKey="inversao" name="Inversão" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} barSize={8} />
              <Bar dataKey="avaria" name="Avaria" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} barSize={8} />
              <Bar dataKey="falta" name="Falta" fill="hsl(160, 84%, 39%)" radius={[0, 4, 4, 0]} barSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 3. PDV × Frequência */}
        <div className="card-stats animate-slide-up" style={{ animationDelay: '1150ms' }}>
          <h3 className="font-heading text-base font-semibold mb-4">Top 10 PDVs com Mais Ocorrências</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pdvFrequenciaData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" allowDecimals={false} fontSize={11} />
              <YAxis type="category" dataKey="nome" stroke="hsl(var(--muted-foreground))" fontSize={9} width={100} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(value) => <span className="text-xs text-muted-foreground capitalize">{value}</span>} />
              <Bar dataKey="inversao" name="Inversão" stackId="a" fill="hsl(199, 89%, 48%)" />
              <Bar dataKey="avaria" name="Avaria" stackId="a" fill="hsl(38, 92%, 50%)" />
              <Bar dataKey="falta" name="Falta" stackId="a" fill="hsl(160, 84%, 39%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 4. Taxa de Resolução por Período */}
        <div className="card-stats animate-slide-up" style={{ animationDelay: '1200ms' }}>
          <h3 className="font-heading text-base font-semibold mb-4">Taxa de Resolução (Últimos 6 Meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={taxaResolucaoData} margin={{ top: 20, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(value) => <span className="text-xs text-muted-foreground capitalize">{value}</span>} />
              <Line type="monotone" dataKey="abertos" name="Abertos" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="encerrados" name="Encerrados" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Protocols */}
      <div className="card-stats animate-slide-up" style={{ animationDelay: '1100ms' }}>
        <h3 className="font-heading text-sm font-semibold mb-2">Protocolos Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left p-2 text-[10px] rounded-tl-lg">Protocolo</th>
                <th className="text-left p-2 text-[10px]">Motorista</th>
                <th className="text-left p-2 text-[10px]">Unidade</th>
                <th className="text-left p-2 text-[10px]">Data</th>
                <th className="text-left p-2 text-[10px]">Status</th>
                <th className="text-right p-2 text-[10px] rounded-tr-lg">Ações</th>
              </tr>
            </thead>
            <tbody>
              {recentProtocolos.map((protocolo) => {
                return (
                  <tr 
                    key={protocolo.id} 
                    className="border-b border-border hover:bg-primary/5 transition-all duration-200 group"
                  >
                    <td className="p-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-primary text-[11px]">{protocolo.numero}</span>
                        {foiReaberto(protocolo.observacoesLog) && (
                          <span 
                            className="inline-flex items-center gap-0.5 text-[9px] text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20 px-1.5 py-0.5 rounded-full w-fit"
                            title="Protocolo reaberto"
                          >
                            <RefreshCw size={9} />
                            Reaberto
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${getAvatarColor(protocolo.motorista.nome)}`}>
                          {getInitials(protocolo.motorista.nome)}
                        </div>
                        <span className="font-medium text-[11px]">{protocolo.motorista.nome}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <span className="text-[11px] font-medium text-muted-foreground">{protocolo.unidadeNome || '—'}</span>
                    </td>
                    <td className="p-2 text-muted-foreground text-[11px]">{protocolo.data}</td>
                    <td className="p-2">
                      <StatusBadge status={protocolo.status} />
                    </td>
                    <td className="p-2 text-right">
                      <Link to={`/protocolos?id=${protocolo.id}`}>
                        <Button 
                          variant="outline" 
                          className="h-5 text-[11px] border-emerald-500 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Eye size={11} className="mr-1" />
                          Ver
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
