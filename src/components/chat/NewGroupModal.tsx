import { useState } from 'react';
import { Users, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnidadesDB } from '@/hooks/useUnidadesDB';
import { cn } from '@/lib/utils';

interface NewGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUnidade: (unidade: string) => void;
}

export function NewGroupModal({ open, onOpenChange, onSelectUnidade }: NewGroupModalProps) {
  const { unidades, isLoading } = useUnidadesDB();

  const handleSelectUnidade = (unidadeNome: string) => {
    onSelectUnidade(unidadeNome);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Entrar em Grupo por Unidade
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Selecione uma unidade para entrar no grupo de chat. Todos os usuários da mesma unidade podem participar.
        </p>

        <ScrollArea className="h-64 mt-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Carregando unidades...
            </div>
          ) : unidades.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma unidade cadastrada
            </p>
          ) : (
            <div className="space-y-2">
              {unidades.map((unidade) => (
                <button
                  key={unidade.id}
                  onClick={() => handleSelectUnidade(unidade.nome)}
                  className="w-full p-3 rounded-lg text-left hover:bg-accent transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{unidade.nome}</span>
                    <p className="text-sm text-muted-foreground">Código: {unidade.codigo}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
