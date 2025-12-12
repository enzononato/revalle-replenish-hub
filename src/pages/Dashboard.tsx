import { StatCard } from '@/components/ui/StatCard';
import { RankingCard } from '@/components/ui/RankingCard';
import { mockStats, mockProtocolos, topMotoristas, topClientes, topProdutos } from '@/data/mockData';
import { FileText, CheckCircle, Clock, Truck, Calendar, Users, Building2, Package } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
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

const barData = [
  { name: 'Seg', abertos: 4, encerrados: 3 },
  { name: 'Ter', abertos: 3, encerrados: 5 },
  { name: 'Qua', abertos: 6, encerrados: 4 },
  { name: 'Qui', abertos: 2, encerrados: 6 },
  { name: 'Sex', abertos: 5, encerrados: 3 },
];

const pieData = [
  { name: 'Abertos', value: mockStats.emAberto },
  { name: 'Em Andamento', value: 1 },
  { name: 'Encerrados', value: mockStats.encerrados },
];

const COLORS = ['hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(160, 84%, 39%)'];

export default function Dashboard() {
  const recentProtocolos = mockProtocolos.slice(0, 5);

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
          value={mockStats.emAberto}
          icon={Clock}
          variant="warning"
          delay={0}
        />
        <StatCard
          title="Encerrados"
          value={mockStats.encerrados}
          icon={CheckCircle}
          variant="success"
          delay={100}
        />
        <StatCard
          title="Total de Protocolos"
          value={mockStats.totalProtocolos}
          icon={FileText}
          variant="primary"
          delay={200}
        />
        <StatCard
          title="Total de Motoristas"
          value={mockStats.totalMotoristas}
          icon={Truck}
          variant="info"
          delay={300}
        />
        <StatCard
          title="Total Hoje"
          value={mockStats.totalHoje}
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
              {recentProtocolos.map((protocolo, index) => (
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
