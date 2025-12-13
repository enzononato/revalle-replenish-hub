import { useMemo, useState } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { RankingCard } from '@/components/ui/RankingCard';
import { topMotoristas, topClientes, topProdutos, mockUnidades } from '@/data/mockData';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, CheckCircle, Clock, Truck, Calendar, Users, Building2, Package, LayoutDashboard, Download } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, isToday, parseISO } from 'date-fns';
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
  Cell
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
      // Revenda: só vê sua unidade
      filtered = filtered.filter(p => p.unidadeNome === user?.unidade);
    } else if (unidadeFiltro !== 'todas') {
      // Admin com filtro ativo
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
    
    // Contar motoristas únicos
    const motoristasUnicos = new Set(protocolosFiltrados.map(p => p.motorista.id)).size;
    
    // Protocolos de hoje
    const totalHoje = protocolosFiltrados.filter(p => {
      try {
        return isToday(parseISO(p.createdAt));
      } catch {
        return false;
      }
    }).length;

    return { emAberto, emAndamento, encerrados, totalProtocolos, motoristasUnicos, totalHoje };
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
            <LayoutDashboard className="text-primary" size={32} />
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema de reposição</p>
        </div>
        <div className="flex gap-2 items-center">
          {isAdmin && (
            <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
              <SelectTrigger className="w-[180px]">
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
          <Button variant="outline" onClick={handleDownloadCSV}>
            <Download size={18} className="mr-2" />
            CSV
          </Button>
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
        />
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RankingCard
          title="Top 5 Motoristas"
          icon={<Users className="text-primary" size={20} />}
          items={topMotoristas}
          delay={500}
        />
        <RankingCard
          title="Top 5 Clientes (PDVs)"
          icon={<Building2 className="text-info" size={20} />}
          items={topClientes}
          delay={600}
        />
        <RankingCard
          title="Top 5 Produtos"
          icon={<Package className="text-success" size={20} />}
          items={topProdutos}
          delay={700}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="card-stats animate-slide-up" style={{ animationDelay: '800ms' }}>
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
              <Bar dataKey="abertos" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="encerrados" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card-stats animate-slide-up" style={{ animationDelay: '900ms' }}>
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
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Protocols */}
      <div className="card-stats animate-slide-up" style={{ animationDelay: '1000ms' }}>
        <h3 className="font-heading text-lg font-semibold mb-4">Protocolos Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left p-4 rounded-tl-lg">Protocolo</th>
                <th className="text-left p-4">Motorista</th>
                <th className="text-left p-4">Data</th>
                <th className="text-left p-4">SLA</th>
                <th className="text-left p-4 rounded-tr-lg">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentProtocolos.map((protocolo) => (
                <tr 
                  key={protocolo.id} 
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="p-4 font-medium">{protocolo.numero}</td>
                  <td className="p-4">{protocolo.motorista.nome}</td>
                  <td className="p-4">{protocolo.data}</td>
                  <td className="p-4">{protocolo.sla}</td>
                  <td className="p-4">
                    <StatusBadge status={protocolo.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
