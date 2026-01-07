import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, MapPin, FileText, Camera, Package, Phone, Send, ClipboardList, LogOut, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TourStep {
  target: string;
  title: string;
  content: string;
  tip?: string;
  icon: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="motorista-tabs"]',
    title: '📋 Navegação Principal',
    content: 'Aqui você pode alternar entre duas áreas: "Novo Protocolo" para abrir um novo chamado, ou "Meus Protocolos" para acompanhar o status dos seus protocolos anteriores.',
    tip: 'Dica: Acompanhe sempre seus protocolos para saber quando foram resolvidos!',
    icon: <ClipboardList className="h-5 w-5" />,
    position: 'bottom',
  },
  {
    target: '[data-tour="campo-mapa"]',
    title: '🗺️ Campo MAPA',
    content: 'Digite o número do MAPA da sua rota. Este é o identificador único do carregamento que você está transportando.',
    tip: 'O MAPA está no documento de entrega que você recebeu.',
    icon: <MapPin className="h-5 w-5" />,
    position: 'bottom',
  },
  {
    target: '[data-tour="campo-pdv"]',
    title: '🏪 Código do PDV',
    content: 'Informe o código do Ponto de Venda onde ocorreu o problema. Comece a digitar para ver sugestões automáticas.',
    tip: 'O código do PDV está na nota fiscal ou no sistema de rotas.',
    icon: <FileText className="h-5 w-5" />,
    position: 'bottom',
  },
  {
    target: '[data-tour="campo-nota-fiscal"]',
    title: '📄 Nota Fiscal',
    content: 'Digite o número da nota fiscal relacionada ao produto com problema. Isso ajuda a rastrear o pedido.',
    icon: <FileText className="h-5 w-5" />,
    position: 'bottom',
  },
  {
    target: '[data-tour="campo-tipo-reposicao"]',
    title: '⚠️ Tipo de Reposição',
    content: 'Selecione o tipo do problema: INVERSÃO (produto errado), FALTA (produto faltando) ou AVARIA (produto danificado).',
    tip: 'Cada tipo tem causas específicas que aparecerão automaticamente.',
    icon: <Package className="h-5 w-5" />,
    position: 'bottom',
  },
  {
    target: '[data-tour="secao-fotos"]',
    title: '📸 Fotos Obrigatórias',
    content: 'Tire fotos para comprovar o problema. Você precisará de: foto no PDV com o motorista, foto do lote do produto, e foto da avaria (se aplicável).',
    tip: 'Fotos claras e bem iluminadas agilizam a análise do seu protocolo!',
    icon: <Camera className="h-5 w-5" />,
    position: 'top',
  },
  {
    target: '[data-tour="secao-produtos"]',
    title: '📦 Produtos',
    content: 'Adicione os produtos com problema. Digite o código ou nome para buscar, informe a quantidade e a validade.',
    tip: 'Para FALTA e AVARIA você pode adicionar vários produtos no mesmo protocolo.',
    icon: <Package className="h-5 w-5" />,
    position: 'top',
  },
  {
    target: '[data-tour="campo-whatsapp"]',
    title: '📱 WhatsApp de Contato',
    content: 'Informe o WhatsApp do cliente ou responsável no PDV para que a equipe possa entrar em contato se necessário.',
    tip: 'Digite apenas números, a formatação é automática!',
    icon: <Phone className="h-5 w-5" />,
    position: 'top',
  },
  {
    target: '[data-tour="btn-enviar"]',
    title: '🚀 Enviar Protocolo',
    content: 'Depois de preencher todos os campos obrigatórios e tirar as fotos, clique aqui para enviar seu protocolo.',
    tip: 'Você receberá uma confirmação com o número do protocolo para acompanhamento.',
    icon: <Send className="h-5 w-5" />,
    position: 'top',
  },
  {
    target: '[data-tour="motorista-logout"]',
    title: '🚪 Sair do Sistema',
    content: 'Quando terminar de usar o portal, clique aqui para fazer logout com segurança.',
    icon: <LogOut className="h-5 w-5" />,
    position: 'bottom',
  },
];

const TOUR_COMPLETED_KEY = 'motorista_guided_tour_completed';

export function MotoristaTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [showWelcome, setShowWelcome] = useState(false);
  const [animateStep, setAnimateStep] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!tourCompleted) {
      const timer = setTimeout(() => setShowWelcome(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    // Trigger animation on step change
    setAnimateStep(true);
    const animTimer = setTimeout(() => setAnimateStep(false), 300);

    const step = tourSteps[currentStep];
    const element = document.querySelector(step.target);

    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      element.classList.add('tour-highlight');

      let top = rect.top + scrollY;
      let left = rect.left + scrollX;

      switch (step.position) {
        case 'top':
          top = rect.top + scrollY - 180;
          left = rect.left + scrollX + rect.width / 2 - 175;
          break;
        case 'bottom':
          top = rect.bottom + scrollY + 12;
          left = rect.left + scrollX + rect.width / 2 - 175;
          break;
        case 'left':
          top = rect.top + scrollY + rect.height / 2 - 90;
          left = rect.left + scrollX - 370;
          break;
        case 'right':
          top = rect.top + scrollY + rect.height / 2 - 90;
          left = rect.right + scrollX + 12;
          break;
      }

      // Ensure tooltip stays within viewport
      left = Math.max(10, Math.min(left, window.innerWidth - 370));
      top = Math.max(10, top);

      setTooltipPosition({ top, left });

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      return () => {
        element.classList.remove('tour-highlight');
        clearTimeout(animTimer);
      };
    }
  }, [isActive, currentStep]);

  const startTour = () => {
    setShowWelcome(false);
    setIsActive(true);
    setCurrentStep(0);
  };

  const endTour = () => {
    setIsActive(false);
    setShowWelcome(false);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });
  };

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);
  };

  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-card rounded-xl shadow-2xl p-6 max-w-md mx-4 animate-bounce-in border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10 animate-pulse">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-foreground">
                Bem-vindo ao Portal! 👋
              </h2>
              <p className="text-sm text-muted-foreground">Motorista</p>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-foreground mb-3">
              Parece que é sua <strong>primeira vez</strong> aqui! 
            </p>
            <p className="text-muted-foreground text-sm">
              Faça um tour interativo de <strong>~2 minutos</strong> para aprender a:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Abrir protocolos de reposição
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Tirar fotos corretamente
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Acompanhar seus protocolos
              </li>
            </ul>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={endTour} className="flex-1">
              Pular por agora
            </Button>
            <Button onClick={startTour} className="flex-1 gap-2">
              <Sparkles className="h-4 w-4" />
              Iniciar Tour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isActive) return null;

  const step = tourSteps[currentStep];

  return (
    <>
      <div className="fixed inset-0 z-[99] bg-foreground/40 backdrop-blur-[2px]" onClick={endTour} />

      <div
        className={cn(
          "fixed z-[100] w-[350px] bg-card rounded-xl shadow-2xl border border-border",
          animateStep ? "animate-scale-in" : ""
        )}
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        <button
          onClick={endTour}
          className="absolute -top-2 -right-2 p-1.5 rounded-full bg-destructive hover:bg-destructive/80 transition-smooth shadow-lg"
        >
          <X className="h-4 w-4 text-destructive-foreground" />
        </button>

        {/* Header with icon */}
        <div className="p-4 border-b border-border bg-muted/30 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {step.icon}
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground text-lg">
                {step.title}
              </h3>
              <span className="text-xs text-muted-foreground">
                Passo {currentStep + 1} de {tourSteps.length}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-foreground leading-relaxed">
            {step.content}
          </p>
          
          {step.tip && (
            <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-primary">
                {step.tip}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30 rounded-b-xl">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={prevStep}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
          
          <Button size="sm" onClick={nextStep} className="gap-1">
            {currentStep === tourSteps.length - 1 ? (
              <>
                Finalizar
                <Sparkles className="h-4 w-4" />
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-3 flex-wrap px-4">
          {tourSteps.map((_, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300 hover:scale-125',
                i === currentStep 
                  ? 'bg-primary w-6' 
                  : i < currentStep 
                    ? 'bg-primary/50' 
                    : 'bg-muted-foreground/30'
              )}
              title={`Ir para passo ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 100;
          box-shadow: 0 0 0 4px hsl(var(--primary) / 0.4), 0 0 30px hsl(var(--primary) / 0.3);
          border-radius: 8px;
          animation: tour-pulse 2s ease-in-out infinite;
        }
        
        @keyframes tour-pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px hsl(var(--primary) / 0.4), 0 0 30px hsl(var(--primary) / 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px hsl(var(--primary) / 0.2), 0 0 40px hsl(var(--primary) / 0.4);
          }
        }
      `}</style>
    </>
  );
}

export function resetMotoristaTour() {
  localStorage.removeItem(TOUR_COMPLETED_KEY);
}
