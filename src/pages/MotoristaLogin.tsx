import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMotoristaAuth } from '@/contexts/MotoristaAuthContext';
import { Truck, Eye, EyeOff, Loader2, Check, AlertCircle, ShieldCheck } from 'lucide-react';

interface TouchedFields {
  identificador: boolean;
  senha: boolean;
}

export default function MotoristaLogin() {
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>({ identificador: false, senha: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useMotoristaAuth();

  const handleBlur = (field: keyof TouchedFields) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isFieldValid = (field: 'identificador' | 'senha') => {
    if (field === 'identificador') return identificador.trim().length >= 1;
    if (field === 'senha') return senha.length >= 4;
    return false;
  };

  const getFieldStatus = (field: 'identificador' | 'senha') => {
    if (!touched[field]) return 'neutral';
    return isFieldValid(field) ? 'valid' : 'invalid';
  };

  const getInputClassName = (field: 'identificador' | 'senha') => {
    const status = getFieldStatus(field);
    const base = "h-14 text-base bg-secondary/50 border-border/60 rounded-xl pl-4 pr-12 transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary";
    if (status === 'valid') return `${base} border-emerald-400 focus-visible:ring-emerald-300`;
    if (status === 'invalid') return `${base} border-destructive focus-visible:ring-destructive/30`;
    return base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched({ identificador: true, senha: true });
    
    if (!isFieldValid('identificador') || !isFieldValid('senha')) {
      toast({
        title: "Campos inválidos",
        description: "Preencha todos os campos corretamente.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const result = await login(identificador.trim(), senha);
      
      if (result.success) {
        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao portal do motorista.",
        });
        navigate('/motorista/portal');
      } else {
        toast({
          title: "Erro no login",
          description: result.error || "Código ou senha incorretos.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao fazer login. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header decorativo com curva */}
      <div className="relative bg-primary pt-14 pb-16 px-6">
        {/* Círculos decorativos */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-foreground/5" />
        <div className="absolute bottom-4 -left-8 w-32 h-32 rounded-full bg-primary-foreground/5" />
        <div className="absolute top-6 right-6 w-16 h-16 rounded-full bg-primary-foreground/8" />
        
        <div className="relative z-10 max-w-md mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm mb-4 shadow-lg">
            <Truck className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">
            Portal do Motorista
          </h1>
          <p className="text-sm text-primary-foreground/70 mt-1">
            Reposição Revalle
          </p>
        </div>

        {/* Curva suave na base */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-10" preserveAspectRatio="none">
            <path d="M0 80V30C240 0 480 0 720 30C960 60 1200 60 1440 30V80H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </div>

      {/* Card de login */}
      <div className="flex-1 px-5 -mt-2 pb-8 max-w-md mx-auto w-full">
        <div className="bg-card rounded-2xl shadow-xl border border-border/40 p-6">
          <p className="text-sm text-muted-foreground text-center mb-6">
            Faça login para registrar protocolos e acompanhar suas entregas
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identificador" className="text-sm font-semibold text-foreground">
                CPF ou Código
              </Label>
              <div className="relative">
                <Input
                  id="identificador"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  placeholder="Digite seu CPF ou código Promax"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => handleBlur('identificador')}
                  className={getInputClassName('identificador')}
                  disabled={isLoading}
                />
                {touched.identificador && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isFieldValid('identificador') ? (
                      <Check className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Petrolina: use o código Promax. Outras unidades: use o CPF.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha" className="text-sm font-semibold text-foreground">
                Senha
              </Label>
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
                  {touched.senha && (
                    isFieldValid('senha') ? (
                      <Check className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-base font-semibold rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs">Acesso seguro • Reposição v3.1.2</span>
        </div>
      </div>
    </div>
  );
}