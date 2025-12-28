import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

const SHORTCUTS_STORAGE_KEY = 'shortcuts_enabled';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'd',
      alt: true,
      description: 'Ir para Dashboard',
      action: () => navigate('/dashboard'),
    },
    {
      key: 'p',
      alt: true,
      description: 'Ir para Protocolos',
      action: () => navigate('/protocolos'),
    },
    {
      key: 'c',
      alt: true,
      description: 'Ir para Chat',
      action: () => navigate('/chat'),
    },
    {
      key: 'm',
      alt: true,
      description: 'Ir para Motoristas',
      action: () => navigate('/motoristas'),
    },
    {
      key: 'n',
      alt: true,
      description: 'Novo Protocolo',
      action: () => {
        navigate('/protocolos');
        setTimeout(() => {
          const createBtn = document.querySelector('[data-create-protocolo]') as HTMLButtonElement;
          createBtn?.click();
        }, 100);
      },
    },
    {
      key: '/',
      description: 'Focar na busca',
      action: () => {
        const searchInput = document.querySelector('input[type="text"][placeholder*="Buscar"], input[type="search"]') as HTMLInputElement;
        searchInput?.focus();
      },
    },
    {
      key: 'Escape',
      description: 'Fechar modal/painel',
      action: () => {
        const closeBtn = document.querySelector('[data-close-modal], [aria-label="Close"]') as HTMLButtonElement;
        closeBtn?.click();
      },
    },
    {
      key: '?',
      shift: true,
      description: 'Mostrar atalhos',
      action: () => {
        const event = new CustomEvent('show-shortcuts-modal');
        window.dispatchEvent(event);
      },
    },
  ];

  const isShortcutsEnabled = useCallback(() => {
    return localStorage.getItem(SHORTCUTS_STORAGE_KEY) !== 'false';
  }, []);

  const toggleShortcuts = useCallback((enabled: boolean) => {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, String(enabled));
    toast.success(enabled ? 'Atalhos de teclado ativados' : 'Atalhos de teclado desativados');
  }, []);

  useEffect(() => {
    if (!isShortcutsEnabled()) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Only allow Escape in inputs
        if (event.key !== 'Escape') return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, isShortcutsEnabled]);

  return {
    shortcuts,
    isShortcutsEnabled,
    toggleShortcuts,
  };
}
