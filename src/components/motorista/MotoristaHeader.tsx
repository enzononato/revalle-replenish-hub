import { Motorista } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, WifiOff, Cloud, User, PackageCheck, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MotoristaHeaderProps {
  motorista: Motorista;
  isOnline: boolean;
  pendingCount: number;
  onLogout: () => void;
}

export function MotoristaHeader({ motorista, isOnline, pendingCount, onLogout }: MotoristaHeaderProps) {
  const initials = motorista.nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/75 text-primary-foreground px-4 pt-5 pb-6 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="max-w-xl mx-auto relative z-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {!isOnline && (
              <Badge variant="destructive" className="gap-1.5 bg-destructive/90">
                <WifiOff className="w-3.5 h-3.5" />
                Offline
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge className="bg-orange-500 text-white border-0">
                <Cloud className="w-3.5 h-3.5 mr-1" />
                {pendingCount}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout} 
            className="h-8 px-3 text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 text-xs"
            data-tour="motorista-logout"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Sair
          </Button>
        </div>

        {/* Card principal com info do motorista */}
        <div className="bg-white/[0.08] backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold">
              {initials || <User className="w-6 h-6" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate leading-tight">
                {motorista.nome}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-primary-foreground/70">
                <span className="bg-white/10 px-2 py-0.5 rounded-md">{motorista.codigo}</span>
                <span>•</span>
                <span className="truncate">{motorista.unidade}</span>
              </div>
            </div>
          </div>

          {/* Divider + mission */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-start gap-2.5">
            <Truck className="w-4 h-4 text-primary-foreground/50 shrink-0 mt-0.5" />
            <p className="text-xs text-primary-foreground/60 leading-relaxed">
              Portal de reposições e pós-rota
            </p>
          </div>
        </div>

        {/* Versão */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-primary-foreground/40">
          <PackageCheck className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium">Reposição v3.1.2</span>
        </div>
      </div>
    </div>
  );
}
