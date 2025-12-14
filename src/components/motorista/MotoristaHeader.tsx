import { Motorista } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, LogOut, WifiOff, Cloud } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface MotoristaHeaderProps {
  motorista: Motorista;
  isOnline: boolean;
  pendingCount: number;
  onLogout: () => void;
}

export function MotoristaHeader({ motorista, isOnline, pendingCount, onLogout }: MotoristaHeaderProps) {
  return (
    <div className="bg-background border-b border-border px-4 py-6">
      <div className="max-w-lg mx-auto flex flex-col items-center text-center">
        {/* Badge REVALLE */}
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
          <Truck className="w-5 h-5" />
          <span className="font-bold text-sm tracking-wide">REVALLE</span>
        </div>

        {/* Título */}
        <h1 className="text-xl font-bold text-foreground mb-1">
          Abertura de Protocolo de Reposição
        </h1>
        
        {/* Subtítulo */}
        <p className="text-sm text-muted-foreground mb-4">
          Preencha os dados abaixo para registrar seu protocolo
        </p>

        <Separator className="mb-4 w-full max-w-xs" />

        {/* Informações do motorista */}
        <div className="space-y-1 mb-4">
          <p className="text-lg font-semibold text-foreground">
            Nome: {motorista.nome}
          </p>
          <p className="text-base text-muted-foreground">
            Código: {motorista.codigo}
          </p>
          <p className="text-base text-muted-foreground">
            Unidade: {motorista.unidade}
          </p>
        </div>

        {/* Texto explicativo */}
        <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md mb-4 max-w-sm">
          Em casos de avaria ou falta de produto, o motorista pode registrar mais de um item dentro do mesmo protocolo.
        </p>

        {/* Status e Logout */}
        <div className="flex items-center gap-3">
          {!isOnline && (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="w-3 h-3" />
              Offline
            </Badge>
          )}
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
              <Cloud className="w-3 h-3 mr-1" />
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={onLogout} className="h-8 px-3">
            <LogOut className="h-4 w-4 mr-1" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
