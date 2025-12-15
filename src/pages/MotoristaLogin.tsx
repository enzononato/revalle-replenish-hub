import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMotoristaAuth } from '@/contexts/MotoristaAuthContext';
import { Package, Eye, EyeOff, Loader2, Check, AlertCircle } from 'lucide-react';

interface TouchedFields {
  codigo: boolean;
  senha: boolean;
}

export default function MotoristaLogin() {
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>({ codigo: false, senha: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useMotoristaAuth();

  const handleBlur = (field: keyof TouchedFields) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isFieldValid = (field: 'codigo' | 'senha') => {
    if (field === 'codigo') return codigo.trim().length >= 3;
    if (field === 'senha') return senha.length >= 4;
    return false;
  };

  const getFieldStatus = (field: 'codigo' | 'senha') => {
    if (!touched[field]) return 'neutral';
    return isFieldValid(field) ? 'valid' : 'invalid';
  };

  const getInputClassName = (field: 'codigo' | 'senha') => {
    const status = getFieldStatus(field);
    const base = "h-10 text-sm pr-10 transition-all";
    if (status === 'valid') return `${base} border-green-500 focus-visible:ring-green-500`;
    if (status === 'invalid') return `${base} border-destructive focus-visible:ring-destructive`;
    return base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched({ codigo: true, senha: true });
    
    if (!isFieldValid('codigo') || !isFieldValid('senha')) {
      toast({
        title: "Campos inválidos",
        description: "Preencha todos os campos corretamente.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const result = await login(codigo.trim(), senha);
      
      if (result.success) {
        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao portal do motorista.",
        });
        navigate('/motorista');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Portal do Motorista</CardTitle>
          <CardDescription className="mt-1">
            Faça login para registrar protocolos de reposição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="codigo" className="text-sm">Código do Motorista</Label>
              <div className="relative">
                <Input
                  id="codigo"
                  type="text"
                  placeholder="Digite seu código"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onBlur={() => handleBlur('codigo')}
                  className={getInputClassName('codigo')}
                  disabled={isLoading}
                />
                {touched.codigo && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isFieldValid('codigo') ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha" className="text-sm">Senha</Label>
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
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {touched.senha && (
                    isFieldValid('senha') ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Teste:</strong> código <code className="bg-background px-1 rounded">60121</code> senha <code className="bg-background px-1 rounded">123456</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}