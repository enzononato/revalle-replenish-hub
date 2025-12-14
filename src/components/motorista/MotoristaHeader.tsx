import { Motorista } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, WifiOff, Cloud, User, PackageCheck } from 'lucide-react';

interface MotoristaHeaderProps {
  motorista: Motorista;
  isOnline: boolean;
  pendingCount: number;
  onLogout: () => void;
}

export function MotoristaHeader({ motorista, isOnline, pendingCount, onLogout }: MotoristaHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-4 py-6">
      <div className="max-w-lg mx-auto">
        {/* Top bar com status e logout */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {!isOnline && (
              <Badge variant="destructive" className="gap-1 bg-destructive/90">
                <WifiOff className="w-3 h-3" />
                Offline
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge className="bg-orange-500 text-white border-0">
                <Cloud className="w-3 h-3 mr-1" />
                {pendingCount}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout} 
            className="h-8 px-3 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sair
          </Button>
        </div>

        {/* Avatar e informações do motorista */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-primary-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate mb-0.5">
              {motorista.nome}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-primary-foreground/80">
              <span>Cód: {motorista.codigo}</span>
              <span className="hidden sm:inline">•</span>
              <span>{motorista.unidade}</span>
            </div>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="mt-5 bg-white/10 rounded-lg px-4 py-3">
          <p className="text-sm text-primary-foreground font-semibold mb-1">
            Protocolo de Reposição:
          </p>
          <p className="text-sm text-primary-foreground/90 leading-relaxed mb-1">
            Utilize este protocolo para registrar <strong>Falta</strong>, <strong>Inversão</strong> ou <strong>Avaria</strong> de produtos.
          </p>
          <p className="text-sm text-primary-foreground/80">
            É possível adicionar vários produtos no mesmo protocolo.
          </p>
        </div>

        {/* Logo e versão */}
        <div className="mt-4 flex items-center justify-center gap-2 text-primary-foreground/70">
          <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center">
            <PackageCheck className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium">Reposição v2.1.2</span>
        </div>
      </div>
    </div>
  );
}
