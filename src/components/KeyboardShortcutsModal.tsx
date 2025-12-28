import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);
  const { shortcuts } = useKeyboardShortcuts();

  useEffect(() => {
    const handleShowModal = () => setOpen(true);
    window.addEventListener('show-shortcuts-modal', handleShowModal);
    return () => window.removeEventListener('show-shortcuts-modal', handleShowModal);
  }, []);

  const formatShortcut = (shortcut: typeof shortcuts[0]) => {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.shift) parts.push('Shift');
    parts.push(shortcut.key === '/' ? '/' : shortcut.key.toUpperCase());
    return parts;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 mt-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-smooth"
            >
              <span className="text-sm text-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {formatShortcut(shortcut).map((key, i) => (
                  <span key={i}>
                    <kbd className="px-2 py-1 text-xs font-mono bg-background border border-border rounded shadow-sm">
                      {key}
                    </kbd>
                    {i < formatShortcut(shortcut).length - 1 && (
                      <span className="mx-0.5 text-muted-foreground">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Pressione <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Shift + ?</kbd> para abrir este menu
        </p>
      </DialogContent>
    </Dialog>
  );
}
