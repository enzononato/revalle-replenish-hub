import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMotoristaAuth } from '@/contexts/MotoristaAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Eye, EyeOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TouchedFields {
  codigo: boolean;
  senha: boolean;
}

export default function MotoristaLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useMotoristaAuth();
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>({
    codigo: false,
    senha: false,
  });

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/motorista/portal', { replace: true });
    return null;
  }

  const handleBlur = (field: keyof TouchedFields) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isFieldValid = (field: keyof TouchedFields): boolean => {
    switch (field) {
      case 'codigo':
        return codigo.trim().length > 0;
      case 'senha':
        return senha.trim().length >= 4;
      default:
        return false;
    }
  };

  const getFieldStatus = (field: keyof TouchedFields): 'valid' | 'invalid' | 'neutral' => {
    if (!touched[field]) return 'neutral';
    return isFieldValid(field) ? 'valid' : 'invalid';
  };

  const getInputClassName = (field: keyof TouchedFields): string => {
    const status = getFieldStatus(field);
    const baseClass = 'h-12 text-base';
    
    switch (status) {
      case 'valid':
        return `${baseClass} border-green-500 focus:ring-green-500 focus:border-green-500`;
      case 'invalid':
        return `${baseClass} border-red-500 focus:ring-red-500 focus:border-red-500`;
      default:
        return baseClass;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ codigo: true, senha: true });
    
    if (!codigo.trim() || !senha.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    const result = await login(codigo.trim(), senha);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'Login realizado',
        description: 'Bem-vindo ao portal do motorista!'
      });
      navigate('/motorista/portal', { replace: true });
    } else {
      toast({
        title: 'Erro no login',
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4 safe-area-inset">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Truck className="w-10 h-10 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Portal do Motorista
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Faça login para abrir protocolos
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Código do Motorista */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="codigo" className="text-base">Código do Motorista</Label>
                {getFieldStatus('codigo') === 'valid' && (
                  <Check className="w-5 h-5 text-green-500" />
                )}
              </div>
              <Input
                id="codigo"
                type="text"
                inputMode="numeric"
                placeholder="Ex: 60121"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onBlur={() => handleBlur('codigo')}
                className={getInputClassName('codigo')}
                autoComplete="username"
              />
              {getFieldStatus('codigo') === 'invalid' && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Digite seu código
                </p>
              )}
            </div>
            
            {/* Senha */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha" className="text-base">Senha</Label>
                {getFieldStatus('senha') === 'valid' && (
                  <Check className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onBlur={() => handleBlur('senha')}
                  className={`${getInputClassName('senha')} pr-12`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {getFieldStatus('senha') === 'invalid' && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Mínimo 4 caracteres
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-base font-semibold mt-6" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Teste:</strong> Código <code className="bg-background px-2 py-0.5 rounded font-mono">60121</code> e senha <code className="bg-background px-2 py-0.5 rounded font-mono">123456</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
