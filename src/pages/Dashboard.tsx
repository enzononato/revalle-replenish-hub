import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '@/components/ui/StatCard';
import { RankingCard } from '@/components/ui/RankingCard';
import { AlertCard } from '@/components/ui/AlertCard';
import { mockUnidades } from '@/data/mockData';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMotoristasDB } from '@/hooks/useMotoristasDB';
import { FileText, CheckCircle, Clock, Truck, Calendar, Users, Building2, Package, Download, Eye, TrendingUp, MapPin, CalendarRange, X, RefreshCw, Repeat, AlertTriangle, PackageX, Timer } from 'lucide-react';
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
import { format, isToday, parseISO, differenceInHours, differenceInDays, subDays, parse, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList
} from 'recharts';
import { ObservacaoLog } from '@/types';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(160, 84%, 39%)'];

type PeriodoFiltro = 'hoje' | 'semana' | 'mes' | 'todos' | 'custom';

export default function Dashboard() {
  const { protocolos } = useProtocolos();
  const { isAdmin, user } = useAuth();
  const { motoristas } = useMotoristasDB();
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>('todas');
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>('todos');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Protocolos filtrados por unidade e período
  const protocolosFiltrados = useMemo(() => {
    let filtered = protocolos.filter(p => !p.oculto);
    
    if (!isAdmin) {
      filtered = filtered.filter(p => p.unidadeNome === user?.unidade);
    } else if (unidadeFiltro !== 'todas') {
      filtered = filtered.filter(p => p.unidadeNome === unidadeFiltro);
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
  }, [protocolos, isAdmin, user?.unidade, unidadeFiltro, periodoFiltro, dateRange]);

  // Total de motoristas do banco de dados (filtrado por unidade)
  const totalMotoristasBase = useMemo(() => {
    if (!isAdmin) {
      return motoristas.filter(m => m.unidade === user?.unidade).length;
    }
    if (unidadeFiltro !== 'todas') {
      return motoristas.filter(m => m.unidade === unidadeFiltro).length;
    }
    return motoristas.length;
  }, [motoristas, isAdmin, user?.unidade, unidadeFiltro]);

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
        return isToday(parseISO(p.createdAt));
      } catch {
        return false;
      }
    }).length;

    // Calcular tendência (comparar com ontem)
    const ontem = subDays(new Date(), 1);
    const totalOntem = protocolosFiltrados.filter(p => {
      try {
        const date = parseISO(p.createdAt);
        return format(date, 'yyyy-MM-dd') === format(ontem, 'yyyy-MM-dd');
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

  // Dados do gráfico de barras (últimos 5 dias)
  const barData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();
    const result = [];
    
    for (let i = 4; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayProtocolos = protocolosFiltrados.filter(p => {
        try {
          return format(parseISO(p.createdAt), 'yyyy-MM-dd') === dateStr;
        } catch {
          return false;
        }
      });
      
      result.push({
        name: dayName,
        abertos: dayProtocolos.filter(p => p.status === 'aberto').length,
        encerrados: dayProtocolos.filter(p => p.status === 'encerrado').length,
      });
    }
    
    return result;
  }, [protocolosFiltrados]);

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

  // TOP 5 Clientes PDVs (calculado dos protocolos reais)
  const topClientesReal = useMemo(() => {
    const contagem: Record<string, number> = {};
    protocolosFiltrados.forEach(p => {
      const pdv = p.codigoPdv || 'Sem PDV';
      contagem[pdv] = (contagem[pdv] || 0) + 1;
    });
    return Object.entries(contagem)
      .map(([nome, quantidade], index) => ({ id: `pdv-${index}`, nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [protocolosFiltrados]);

  // TOP 5 Produtos (calculado dos protocolos reais)
  const topProdutosReal = useMemo(() => {
    const contagem: Record<string, number> = {};
    protocolosFiltrados.forEach(p => {
      p.produtos?.forEach(prod => {
        contagem[prod.nome] = (contagem[prod.nome] || 0) + prod.quantidade;
      });
    });
    return Object.entries(contagem)
      .map(([nome, quantidade], index) => ({ id: `produto-${index}`, nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
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
  const getDataEncerramentoFromLog = (observacoesLog?: ObservacaoLog[]): string | null => {
    const logEncerramento = observacoesLog?.find(l => l.acao === 'Encerrou o protocolo');
    return logEncerramento?.data || null;
  };

  // Função para cor do SLA - padronizada com página Protocolos (dias)
  const calcularSlaDias = (createdAt: string, status?: string, observacoesLog?: ObservacaoLog[]): number => {
    try {
      const dataProtocolo = parseISO(createdAt);
      
      // Se encerrado, calcular até a data de encerramento
      if (status === 'encerrado') {
        const dataEncerramentoStr = getDataEncerramentoFromLog(observacoesLog);
        if (dataEncerramentoStr) {
          const dataEncerramento = parse(dataEncerramentoStr, 'dd/MM/yyyy', new Date());
          return differenceInDays(dataEncerramento, dataProtocolo);
        }
      }
      
      return differenceInDays(new Date(), dataProtocolo);
    } catch {
      return 0;
    }
  };

  // Protocolos próximos de atingir 16 dias de SLA (13-15 dias)
  const protocolosProximosSLA = useMemo(() => {
    return protocolosFiltrados
      .filter(p => p.status !== 'encerrado')
      .map(p => {
        const slaDias = calcularSlaDias(p.createdAt, p.status, p.observacoesLog);
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
  const foiReaberto = (observacoesLog?: ObservacaoLog[]): boolean => {
    return !!observacoesLog?.some(log => log.acao === 'Reabriu o protocolo');
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

            {isAdmin && (
              <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
                <SelectTrigger className="w-[160px] h-8 text-xs bg-background/80 backdrop-blur-sm">
                  <SelectValue placeholder="Todas as Unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Unidades</SelectItem>
                  {mockUnidades.map(u => (
                    <SelectItem key={u.id} value={u.nome}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="h-8 text-xs bg-background/80 backdrop-blur-sm">
              <Download size={14} className="mr-1.5" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div data-tour="dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Em Aberto"
          value={stats.emAberto}
          icon={Clock}
          variant="warning"
          delay={0}
          href="/protocolos?status=aberto"
        />
        <StatCard
          title="Encerrados Hoje"
          value={protocolosFiltrados.filter(p => p.status === 'encerrado' && (() => {
            try { return isToday(parseISO(p.createdAt)); } catch { return false; }
          })()).length}
          icon={CheckCircle}
          variant="success"
          delay={100}
          href="/protocolos?status=encerrado&periodo=hoje"
        />
        <StatCard
          title="Total de Protocolos"
          value={stats.totalProtocolos}
          icon={FileText}
          variant="primary"
          delay={200}
          href="/protocolos"
        />
        <StatCard
          title="Total de Motoristas"
          value={totalMotoristasBase}
          icon={Truck}
          variant="info"
          delay={300}
          href="/motoristas"
        />
        <StatCard
          title="Total Hoje"
          value={stats.totalHoje}
          icon={Calendar}
          variant="info"
          delay={400}
          href="/protocolos?periodo=hoje"
        />
      </div>

      {/* Estatísticas por Tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Inversão"
          value={contagemPorTipo.inversao}
          icon={Repeat}
          variant="info"
          delay={450}
          href="/protocolos?tipo=INVERSAO&status=todos"
        />
        <StatCard
          title="Avaria"
          value={contagemPorTipo.avaria}
          icon={AlertTriangle}
          variant="warning"
          delay={475}
          href="/protocolos?tipo=AVARIA&status=todos"
        />
        <StatCard
          title="Falta"
          value={contagemPorTipo.falta}
          icon={PackageX}
          variant="primary"
          delay={500}
          href="/protocolos?tipo=FALTA&status=todos"
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header bg-amber-500/10">
                  <th className="text-left p-2 text-[10px] rounded-tl-lg">Protocolo</th>
                  <th className="text-left p-2 text-[10px]">Motorista</th>
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
          <h3 className="font-heading text-base font-semibold mb-3">Protocolos da Semana</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} domain={[0, 'dataMax']} fontSize={11} />
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
                <LabelList dataKey="abertos" position="top" className="fill-muted-foreground text-[10px]" />
              </Bar>
              <Bar dataKey="encerrados" name="Encerrados" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="encerrados" position="top" className="fill-muted-foreground text-[10px]" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card-stats animate-slide-up" style={{ animationDelay: '1000ms' }}>
          <h3 className="font-heading text-base font-semibold mb-3">Status dos Protocolos</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                fontSize={10}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend 
                wrapperStyle={{ paddingTop: '8px' }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
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
                <th className="text-left p-2 text-[10px]">Data</th>
                <th className="text-left p-2 text-[10px]">SLA</th>
                <th className="text-left p-2 text-[10px]">Status</th>
                <th className="text-right p-2 text-[10px] rounded-tr-lg">Ações</th>
              </tr>
            </thead>
            <tbody>
              {recentProtocolos.map((protocolo) => {
                const slaDias = calcularSlaDias(protocolo.createdAt, protocolo.status, protocolo.observacoesLog);
                
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
                    <td className="p-2 text-muted-foreground text-[11px]">{protocolo.data}</td>
                    <td className="p-2">
                      {protocolo.status === 'encerrado' ? (
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                          ✓ {slaDias} {slaDias === 1 ? 'dia' : 'dias'}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getSlaColor(slaDias)}`}>
                          {slaDias} {slaDias === 1 ? 'dia' : 'dias'}
                        </span>
                      )}
                    </td>
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
