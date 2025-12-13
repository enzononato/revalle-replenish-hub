import { useRef } from 'react';
import { Upload, X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface PhotoUploadSectionProps {
  tipoReposicao: string;
  fotoMotoristaPdv: string | null;
  fotoLoteProduto: string | null;
  fotoAvaria: string | null;
  setFotoMotoristaPdv: (value: string | null) => void;
  setFotoLoteProduto: (value: string | null) => void;
  setFotoAvaria: (value: string | null) => void;
}

export function PhotoUploadSection({
  tipoReposicao,
  fotoMotoristaPdv,
  fotoLoteProduto,
  fotoAvaria,
  setFotoMotoristaPdv,
  setFotoLoteProduto,
  setFotoAvaria,
}: PhotoUploadSectionProps) {
  const fotoMotoristaPdvRef = useRef<HTMLInputElement>(null);
  const fotoLoteProdutoRef = useRef<HTMLInputElement>(null);
  const fotoAvariaRef = useRef<HTMLInputElement>(null);

  const handleFotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!tipoReposicao) return null;

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-dashed">
      <Label className="flex items-center gap-2">
        <Camera size={18} />
        Fotos Obrigatórias
      </Label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Foto Motorista/PDV */}
        <div className="space-y-2">
          <Label className="text-sm">
            Foto Motorista/PDV <span className="text-destructive">*</span>
          </Label>
          <input
            type="file"
            accept="image/*"
            ref={fotoMotoristaPdvRef}
            onChange={(e) => handleFotoUpload(e, setFotoMotoristaPdv)}
            className="hidden"
          />
          {fotoMotoristaPdv ? (
            <div className="relative">
              <img 
                src={fotoMotoristaPdv} 
                alt="Foto Motorista/PDV" 
                className="w-full h-32 object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => setFotoMotoristaPdv(null)}
              >
                <X size={14} />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-32 flex flex-col gap-2"
              onClick={() => fotoMotoristaPdvRef.current?.click()}
            >
              <Upload size={24} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Clique para enviar</span>
            </Button>
          )}
        </div>

        {/* Foto Lote Produto */}
        <div className="space-y-2">
          <Label className="text-sm">
            Foto Lote Produto <span className="text-destructive">*</span>
          </Label>
          <input
            type="file"
            accept="image/*"
            ref={fotoLoteProdutoRef}
            onChange={(e) => handleFotoUpload(e, setFotoLoteProduto)}
            className="hidden"
          />
          {fotoLoteProduto ? (
            <div className="relative">
              <img 
                src={fotoLoteProduto} 
                alt="Foto Lote Produto" 
                className="w-full h-32 object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => setFotoLoteProduto(null)}
              >
                <X size={14} />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-32 flex flex-col gap-2"
              onClick={() => fotoLoteProdutoRef.current?.click()}
            >
              <Upload size={24} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Clique para enviar</span>
            </Button>
          )}
        </div>

        {/* Foto Avaria - Apenas para tipo "avaria" */}
        {tipoReposicao === 'avaria' && (
          <div className="space-y-2">
            <Label className="text-sm">
              Foto Avaria <span className="text-destructive">*</span>
            </Label>
            <input
              type="file"
              accept="image/*"
              ref={fotoAvariaRef}
              onChange={(e) => handleFotoUpload(e, setFotoAvaria)}
              className="hidden"
            />
            {fotoAvaria ? (
              <div className="relative">
                <img 
                  src={fotoAvaria} 
                  alt="Foto Avaria" 
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => setFotoAvaria(null)}
                >
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-32 flex flex-col gap-2"
                onClick={() => fotoAvariaRef.current?.click()}
              >
                <Upload size={24} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Clique para enviar</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
