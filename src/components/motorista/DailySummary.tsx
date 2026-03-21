import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Motorista } from '@/types';
import { FileText, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface DailySummaryProps {
  motorista: Motorista;
}

export function DailySummary({ motorista }: DailySummaryProps) {
  const [stats, setStats] = useState({ abertos: 0, emAndamento: 0, encerrados: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const hoje = format(new Date(), 'dd/MM/yyyy');

      const { data } = await supabase
        .from('protocolos')
        .select('status')
        .eq('motorista_codigo', motorista.codigo)
        .eq('data', hoje)
        .or('oculto.is.null,oculto.eq.false');

      if (data) {
        setStats({
          abertos: data.filter(p => p.status === 'aberto').length,
          emAndamento: data.filter(p => p.status === 'em_andamento').length,
          encerrados: data.filter(p => p.status === 'encerrado').length,
        });
      }
    };

    fetchStats();

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [motorista.codigo]);

  const total = stats.abertos + stats.emAndamento + stats.encerrados;

  if (total === 0) return null;

  return (
    <div className="px-4 pt-3 max-w-lg mx-auto">
      <div className="bg-card border border-border/50 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Hoje</span>
          <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(), 'dd/MM/yyyy')}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center bg-amber-500/10 rounded-lg py-2">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Clock className="w-3 h-3 text-amber-600" />
            </div>
            <p className="text-lg font-bold text-amber-600">{stats.abertos}</p>
            <p className="text-[10px] text-muted-foreground">Abertos</p>
          </div>
          <div className="text-center bg-blue-500/10 rounded-lg py-2">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <FileText className="w-3 h-3 text-blue-600" />
            </div>
            <p className="text-lg font-bold text-blue-600">{stats.emAndamento}</p>
            <p className="text-[10px] text-muted-foreground">Em Atend.</p>
          </div>
          <div className="text-center bg-emerald-500/10 rounded-lg py-2">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-emerald-600">{stats.encerrados}</p>
            <p className="text-[10px] text-muted-foreground">Encerrados</p>
          </div>
        </div>
      </div>
    </div>
  );
}
