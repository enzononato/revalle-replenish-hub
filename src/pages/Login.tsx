import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Login realizado com sucesso!');
        navigate('/dashboard');
      } else {
        toast.error('Email ou senha inválidos');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/30" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-primary-foreground">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-accent rounded-2xl">
              <Truck size={48} />
            </div>
          </div>
          <h1 className="font-heading text-5xl font-bold mb-4">Revalle</h1>
          <p className="text-xl text-primary-foreground/80 text-center max-w-md">
            Sistema de Reposição e Controle de Protocolos
          </p>
          <div className="mt-12 grid grid-cols-2 gap-6 text-center">
            <div className="p-6 bg-primary-foreground/10 rounded-xl backdrop-blur-sm">
              <p className="text-3xl font-bold">100+</p>
              <p className="text-sm text-primary-foreground/70">Motoristas Ativos</p>
            </div>
            <div className="p-6 bg-primary-foreground/10 rounded-xl backdrop-blur-sm">
              <p className="text-3xl font-bold">500+</p>
              <p className="text-sm text-primary-foreground/70">Protocolos/Mês</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="p-3 bg-primary rounded-xl">
              <Truck size={32} className="text-primary-foreground" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-primary">Revalle</h1>
          </div>

          <div className="animate-fade-in">
            <h2 className="font-heading text-3xl font-bold text-foreground mb-2">
              Bem-vindo de volta
            </h2>
            <p className="text-muted-foreground mb-8">
              Entre com suas credenciais para acessar o sistema
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full btn-primary-gradient h-12 text-base"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-8 p-4 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground mb-2">Credenciais de teste:</p>
              <div className="text-sm space-y-1">
                <p><strong>Admin:</strong> admin@revalle.com / admin123</p>
                <p><strong>Usuário:</strong> operador@revalle.com / user123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
