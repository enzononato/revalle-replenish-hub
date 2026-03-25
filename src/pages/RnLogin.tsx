import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRnAuth } from '@/contexts/RnAuthContext';
import { Briefcase, Eye, EyeOff, Loader2, Check, AlertCircle, ShieldCheck } from 'lucide-react';

export default function RnLogin() {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ cpf: false, senha: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useRnAuth();

  const handleBlur = (field: 'cpf' | 'senha') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isFieldValid = (field: 'cpf' | 'senha') => {
    if (field === 'cpf') return cpf.replace(/\D/g, '').length >= 11;
    if (field === 'senha') return senha.length >= 4;
    return false;
  };

  const getInputClassName = (field: 'cpf' | 'senha') => {
    const base = "h-14 text-base bg-secondary/50 border-border/60 rounded-xl pl-4 pr-12 transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary";
    if (!touched[field]) return base;
    if (isFieldValid(field)) return `${base} border-emerald-400 focus-visible:ring-emerald-300`;
    return `${base} border-destructive focus-visible:ring-destructive/30`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ cpf: true, senha: true });

    if (!isFieldValid('cpf') || !isFieldValid('senha')) {
      toast({ title: "Campos inválidos", description: "Preencha todos os campos corretamente.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(cpf.replace(/\D/g, ''), senha);
      if (result.success) {
        // Navigation is immediate, no blocking toast needed
        navigate('/rn/portal');
      } else {
        toast({ title: "Erro no login", description: result.error || "CPF ou senha incorretos.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Ocorreu um erro ao fazer login. Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <div className="relative bg-primary pt-16 pb-20 px-6 shrink-0">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-foreground/5" />
        <div className="absolute bottom-4 -left-8 w-32 h-32 rounded-full bg-primary-foreground/5" />
        <div className="relative z-10 max-w-md mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm mb-3 shadow-lg">
            <Briefcase className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-primary-foreground tracking-tight">Portal do RN</h1>
          <p className="text-xs text-primary-foreground/70 mt-0.5">Representante de Negócio • Revalle</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-8" preserveAspectRatio="none">
            <path d="M0 60V20C360 0 720 0 1080 20C1260 30 1380 30 1440 20V60H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </div>

      <div className="flex-1 px-5 pb-4 max-w-md mx-auto w-full flex flex-col justify-center -mt-4">
        <div className="bg-card rounded-2xl shadow-xl border border-border/40 p-5">
          <p className="text-sm text-muted-foreground text-center mb-5">
            Faça login para visualizar os protocolos de reposição
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cpf" className="text-sm font-semibold text-foreground">CPF</Label>
              <div className="relative">
                <Input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Digite seu CPF"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  onBlur={() => handleBlur('cpf')}
                  className={getInputClassName('cpf')}
                  disabled={isLoading}
                />
                {touched.cpf && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isFieldValid('cpf') ? <Check className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-destructive" />}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha" className="text-sm font-semibold text-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onBlur={() => handleBlur('senha')}
                  className={getInputClassName('senha')}
                  disabled={isLoading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {touched.senha && (isFieldValid('senha') ? <Check className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-destructive" />)}
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-13 text-base font-semibold rounded-xl shadow-md shadow-primary/20 transition-all" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="h-5 w-5 mr-2 animate-spin" />Entrando...</>) : 'Entrar'}
            </Button>
          </form>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs">Acesso seguro • Reposição v3.1.2</span>
        </div>
      </div>
    </div>
  );
}
