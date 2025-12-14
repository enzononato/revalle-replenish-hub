import { useMemo, useState } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { RankingCard } from '@/components/ui/RankingCard';
import { AlertCard } from '@/components/ui/AlertCard';
import { topMotoristas, topClientes, topProdutos, mockUnidades } from '@/data/mockData';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, CheckCircle, Clock, Truck, Calendar, Users, Building2, Package, Download, Eye, TrendingUp } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, isToday, parseISO, differenceInHours, subDays } from 'date-fns';
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

const COLORS = ['hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(160, 84%, 39%)'];

export default function Dashboard() {
  const { protocolos } = useProtocolos();
  const { isAdmin, user } = useAuth();
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>('todas');

  // Protocolos filtrados por unidade
  const protocolosFiltrados = useMemo(() => {
    let filtered = protocolos.filter(p => !p.oculto);
    
    if (!isAdmin) {
      filtered = filtered.filter(p => p.unidadeNome === user?.unidade);
    } else if (unidadeFiltro !== 'todas') {
      filtered = filtered.filter(p => p.unidadeNome === unidadeFiltro);
    }
    
    return filtered;
  }, [protocolos, isAdmin, user?.unidade, unidadeFiltro]);

  // Estatísticas dinâmicas
  const stats = useMemo(() => {
    const emAberto = protocolosFiltrados.filter(p => p.status === 'aberto').length;
    const emAndamento = protocolosFiltrados.filter(p => p.status === 'em_andamento').length;
    const encerrados = protocolosFiltrados.filter(p => p.status === 'encerrado').length;
    const totalProtocolos = protocolosFiltrados.length;
    
    const motoristasUnicos = new Set(protocolosFiltrados.map(p => p.motorista.id)).size;
    
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

    return { emAberto, emAndamento, encerrados, totalProtocolos, motoristasUnicos, totalHoje, tendenciaHoje };
  }, [protocolosFiltrados]);

  // Alertas
  const alertas = useMemo(() => {
    const now = new Date();
    const alerts: { id: string; titulo: string; descricao: string; tipo: 'critico' | 'atencao' }[] = [];
    
    protocolosFiltrados.forEach(p => {
      if (p.status !== 'encerrado') {
        try {
          const horasDiff = differenceInHours(now, parseISO(p.createdAt));
          
          if (horasDiff > 24) {
            alerts.push({
              id: p.id,
              titulo: `Protocolo ${p.numero}`,
              descricao: `Aberto há ${horasDiff}h - ${p.motorista.nome}`,
              tipo: 'critico'
            });
          } else if (horasDiff > 12) {
            alerts.push({
              id: p.id,
              titulo: `Protocolo ${p.numero}`,
              descricao: `Aberto há ${horasDiff}h - ${p.motorista.nome}`,
              tipo: 'atencao'
            });
          }
        } catch {
          // ignore
        }
      }
    });
    
    return alerts.slice(0, 5);
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

  // Função para cor do SLA
  const getSlaStyle = (sla: string) => {
    const horas = parseInt(sla);
    if (horas < 12) return { icon: '🟢', color: 'text-emerald-600 bg-emerald-500/10' };
    if (horas < 24) return { icon: '🟡', color: 'text-amber-600 bg-amber-500/10' };
    return { icon: '🔴', color: 'text-red-600 bg-red-500/10' };
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
    <div className="space-y-8">
      {/* Header Personalizado */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30">
                <TrendingUp size={24} />
              </div>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  {saudacao}, {user?.nome?.split(' ')[0] || 'Usuário'}!
                </h1>
                <p className="text-muted-foreground text-sm capitalize">{dataAtual}</p>
              </div>
            </div>
            
            {/* Badge de pendentes */}
            {stats.emAberto > 0 && (
              <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm font-medium text-amber-700">
                  {stats.emAberto} protocolo{stats.emAberto > 1 ? 's' : ''} aguardando ação
                </span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 items-center">
            {isAdmin && (
              <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
                <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm">
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
            <Button variant="outline" onClick={handleDownloadCSV} className="bg-background/80 backdrop-blur-sm">
              <Download size={18} className="mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="Em Aberto"
          value={stats.emAberto}
          icon={Clock}
          variant="warning"
          delay={0}
        />
        <StatCard
          title="Encerrados"
          value={stats.encerrados}
          icon={CheckCircle}
          variant="success"
          delay={100}
        />
        <StatCard
          title="Total de Protocolos"
          value={stats.totalProtocolos}
          icon={FileText}
          variant="primary"
          delay={200}
        />
        <StatCard
          title="Total de Motoristas"
          value={stats.motoristasUnicos}
          icon={Truck}
          variant="info"
          delay={300}
        />
        <StatCard
          title="Total Hoje"
          value={stats.totalHoje}
          icon={Calendar}
          variant="primary"
          delay={400}
          trend={stats.tendenciaHoje > 0 ? 'up' : stats.tendenciaHoje < 0 ? 'down' : 'neutral'}
          trendValue={`${stats.tendenciaHoje > 0 ? '+' : ''}${stats.tendenciaHoje}% vs ontem`}
        />
      </div>

      {/* Rankings + Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <RankingCard
          title="Top 5 Motoristas"
          icon={<Users className="text-primary" size={20} />}
          items={topMotoristas}
          delay={500}
          variant="primary"
        />
        <RankingCard
          title="Top 5 Clientes (PDVs)"
          icon={<Building2 className="text-sky-500" size={20} />}
          items={topClientes}
          delay={600}
          variant="info"
        />
        <RankingCard
          title="Top 5 Produtos"
          icon={<Package className="text-emerald-500" size={20} />}
          items={topProdutos}
          delay={700}
          variant="success"
        />
        <AlertCard
          items={alertas}
          delay={800}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="card-stats animate-slide-up" style={{ animationDelay: '900ms' }}>
          <h3 className="font-heading text-lg font-semibold mb-4">Protocolos da Semana</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} domain={[0, 'dataMax']} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground capitalize">{value}</span>
                )}
              />
              <Bar dataKey="abertos" name="Abertos" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="abertos" position="top" className="fill-muted-foreground text-xs" />
              </Bar>
              <Bar dataKey="encerrados" name="Encerrados" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="encerrados" position="top" className="fill-muted-foreground text-xs" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card-stats animate-slide-up" style={{ animationDelay: '1000ms' }}>
          <h3 className="font-heading text-lg font-semibold mb-4">Status dos Protocolos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Protocols */}
      <div className="card-stats animate-slide-up" style={{ animationDelay: '1100ms' }}>
        <h3 className="font-heading text-lg font-semibold mb-4">Protocolos Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left p-4 rounded-tl-lg">Protocolo</th>
                <th className="text-left p-4">Motorista</th>
                <th className="text-left p-4">Data</th>
                <th className="text-left p-4">SLA</th>
                <th className="text-left p-4">Status</th>
                <th className="text-right p-4 rounded-tr-lg">Ações</th>
              </tr>
            </thead>
            <tbody>
              {recentProtocolos.map((protocolo) => {
                const slaStyle = getSlaStyle(protocolo.sla);
                
                return (
                  <tr 
                    key={protocolo.id} 
                    className="border-b border-border hover:bg-primary/5 transition-all duration-200 group"
                  >
                    <td className="p-4">
                      <span className="font-semibold text-primary">{protocolo.numero}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(protocolo.motorista.nome)}`}>
                          {getInitials(protocolo.motorista.nome)}
                        </div>
                        <span className="font-medium">{protocolo.motorista.nome}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{protocolo.data}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${slaStyle.color}`}>
                        <span>{slaStyle.icon}</span>
                        {protocolo.sla}
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={protocolo.status} />
                    </td>
                    <td className="p-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye size={16} className="mr-1" />
                        Ver
                      </Button>
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
