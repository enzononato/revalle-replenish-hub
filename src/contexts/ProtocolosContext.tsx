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

const defaultContext: ProtocolosContextType = {
  protocolos: [],
  addProtocolo: async (p: Protocolo) => p,
  updateProtocolo: async (p: Protocolo) => p,
  deleteProtocolo: async () => {},
  isLoading: false,
  isAdding: false,
  isUpdating: false,
};

export function useProtocolos() {
  const context = useContext(ProtocolosContext);
  return context ?? defaultContext;
}
