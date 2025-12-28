import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, User, Phone, Mail, Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileEditModal({ open, onOpenChange }: ProfileEditModalProps) {
  const { user } = useAuth();
  const { profile, updateProfile, uploadFoto, loading } = useUserProfile(user?.email);
  
  const [telefone, setTelefone] = useState('');
  const [emailContato, setEmailContato] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setTelefone(profile.telefone || '');
      setEmailContato(profile.email_contato || '');
      setFotoPreview(profile.foto_url);
    }
  }, [profile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setFotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let fotoUrl = profile?.foto_url;

      // Upload new photo if selected
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        const url = await uploadFoto(file);
        if (url) fotoUrl = url;
      }

      await updateProfile({
        nome: user?.nome,
        telefone,
        email_contato: emailContato,
        foto_url: fotoUrl,
        unidade: user?.unidade,
        nivel: user?.nivel,
      });

      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'US';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-3">
            <div 
              className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {fotoPreview ? (
                <img src={fotoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="text-xs text-muted-foreground">Clique para alterar a foto</span>
          </div>

          {/* User Name (read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User size={14} />
              Nome
            </Label>
            <Input value={user?.nome || ''} disabled className="bg-muted" />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone size={14} />
              Telefone
            </Label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail size={14} />
              E-mail de Contato
            </Label>
            <Input
              type="email"
              value={emailContato}
              onChange={(e) => setEmailContato(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
