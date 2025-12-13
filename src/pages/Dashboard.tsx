import { useMemo } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { RankingCard } from '@/components/ui/RankingCard';
import { topMotoristas, topClientes, topProdutos } from '@/data/mockData';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { FileText, CheckCircle, Clock, Truck, Calendar, Users, Building2, Package } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { format, isToday, parseISO } from 'date-fns';
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

  // Estatísticas dinâmicas
  const stats = useMemo(() => {
    const emAberto = protocolos.filter(p => p.status === 'aberto' && !p.oculto).length;
    const emAndamento = protocolos.filter(p => p.status === 'em_andamento' && !p.oculto).length;
    const encerrados = protocolos.filter(p => p.status === 'encerrado' && !p.oculto).length;
    const totalProtocolos = protocolos.filter(p => !p.oculto).length;
    
    // Contar motoristas únicos
    const motoristasUnicos = new Set(protocolos.map(p => p.motorista.id)).size;
    
    // Protocolos de hoje
    const totalHoje = protocolos.filter(p => {
      try {
        return isToday(parseISO(p.createdAt)) && !p.oculto;
      } catch {
        return false;
      }
    }).length;

    return { emAberto, emAndamento, encerrados, totalProtocolos, motoristasUnicos, totalHoje };
  }, [protocolos]);

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
      
      const dayProtocolos = protocolos.filter(p => {
        try {
          return format(parseISO(p.createdAt), 'yyyy-MM-dd') === dateStr && !p.oculto;
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
  }, [protocolos]);

  // Protocolos recentes
  const recentProtocolos = useMemo(() => 
    protocolos.filter(p => !p.oculto).slice(0, 5),
  [protocolos]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do sistema de reposição</p>
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
              <YAxis stroke="hsl(var(--muted-foreground))" />
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
