import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="motorista-tabs"]',
    title: 'Navegação',
    content: 'Alterne entre criar um novo protocolo ou ver seus protocolos anteriores.',
    position: 'bottom',
  },
  {
    target: '[data-tour="motorista-form"]',
    title: 'Formulário de Protocolo',
    content: 'Preencha os dados do protocolo: mapa, PDV, produtos e fotos.',
    position: 'top',
  },
  {
    target: '[data-tour="motorista-logout"]',
    title: 'Sair do Sistema',
    content: 'Clique aqui para fazer logout quando terminar.',
    position: 'bottom',
  },
];

const TOUR_COMPLETED_KEY = 'motorista_guided_tour_completed';

export function MotoristaTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!tourCompleted) {
      const timer = setTimeout(() => setShowWelcome(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

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
          top = rect.top + scrollY - 120;
          left = rect.left + scrollX + rect.width / 2 - 150;
          break;
        case 'bottom':
          top = rect.bottom + scrollY + 12;
          left = rect.left + scrollX + rect.width / 2 - 150;
          break;
        case 'left':
          top = rect.top + scrollY + rect.height / 2 - 60;
          left = rect.left + scrollX - 320;
          break;
        case 'right':
          top = rect.top + scrollY + rect.height / 2 - 60;
          left = rect.right + scrollX + 12;
          break;
      }

      // Ensure tooltip stays within viewport
      left = Math.max(10, Math.min(left, window.innerWidth - 320));

      setTooltipPosition({ top, left });

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      return () => {
        element.classList.remove('tour-highlight');
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

  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-card rounded-xl shadow-2xl p-6 max-w-md mx-4 animate-bounce-in border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground">
              Bem-vindo ao Portal do Motorista!
            </h2>
          </div>
          
          <p className="text-muted-foreground mb-6">
            Parece que é sua primeira vez aqui. Gostaria de fazer um tour rápido 
            para conhecer as principais funcionalidades?
          </p>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={endTour} className="flex-1">
              Pular
            </Button>
            <Button onClick={startTour} className="flex-1">
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
        className="fixed z-[100] w-[300px] bg-card rounded-xl shadow-2xl border border-border animate-scale-in"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        <button
          onClick={endTour}
          className="absolute -top-2 -right-2 p-1 rounded-full bg-muted hover:bg-muted/80 transition-smooth"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="p-4">
          <h3 className="font-heading font-semibold text-foreground mb-2">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {step.content}
          </p>
        </div>

        <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30 rounded-b-xl">
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} de {tourSteps.length}
          </span>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button size="sm" variant="ghost" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" onClick={nextStep}>
              {currentStep === tourSteps.length - 1 ? 'Finalizar' : 'Próximo'}
              {currentStep < tourSteps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>

        <div className="flex justify-center gap-1 pb-3">
          {tourSteps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-smooth',
                i === currentStep ? 'bg-primary w-4' : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>
      </div>

      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 100;
          box-shadow: 0 0 0 4px hsl(var(--primary) / 0.3), 0 0 20px hsl(var(--primary) / 0.2);
          border-radius: 8px;
        }
      `}</style>
    </>
  );
}

export function resetMotoristaTour() {
  localStorage.removeItem(TOUR_COMPLETED_KEY);
}
