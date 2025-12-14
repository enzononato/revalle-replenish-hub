import { createContext, useContext, ReactNode } from 'react';
import { Protocolo } from '@/types';
import { useProtocolosDB } from '@/hooks/useProtocolosDB';

interface ProtocolosContextType {
  protocolos: Protocolo[];
  addProtocolo: (protocolo: Protocolo) => Promise<Protocolo>;
  updateProtocolo: (protocolo: Protocolo) => Promise<Protocolo>;
  deleteProtocolo: (id: string) => Promise<void>;
  isLoading: boolean;
  isAdding: boolean;
  isUpdating: boolean;
}

const ProtocolosContext = createContext<ProtocolosContextType | undefined>(undefined);

export function ProtocolosProvider({ children }: { children: ReactNode }) {
  const {
    protocolos,
    isLoading,
    addProtocolo,
    updateProtocolo,
    deleteProtocolo,
    isAdding,
    isUpdating
  } = useProtocolosDB();

  return (
    <ProtocolosContext.Provider value={{ 
      protocolos, 
      addProtocolo, 
      updateProtocolo, 
      deleteProtocolo,
      isLoading,
      isAdding,
      isUpdating
    }}>
      {children}
    </ProtocolosContext.Provider>
  );
}

export function useProtocolos() {
  const context = useContext(ProtocolosContext);
  if (!context) {
    throw new Error('useProtocolos must be used within a ProtocolosProvider');
  }
  return context;
}
