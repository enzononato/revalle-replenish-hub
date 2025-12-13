import { createContext, useContext, useState, ReactNode } from 'react';
import { Protocolo } from '@/types';
import { mockProtocolos } from '@/data/mockData';

interface ProtocolosContextType {
  protocolos: Protocolo[];
  addProtocolo: (protocolo: Protocolo) => void;
  updateProtocolo: (protocolo: Protocolo) => void;
  deleteProtocolo: (id: string) => void;
}

const ProtocolosContext = createContext<ProtocolosContextType | undefined>(undefined);

export function ProtocolosProvider({ children }: { children: ReactNode }) {
  const [protocolos, setProtocolos] = useState<Protocolo[]>(mockProtocolos);

  const addProtocolo = (protocolo: Protocolo) => {
    setProtocolos(prev => [protocolo, ...prev]);
  };

  const updateProtocolo = (protocoloAtualizado: Protocolo) => {
    setProtocolos(prev => prev.map(p => 
      p.id === protocoloAtualizado.id ? protocoloAtualizado : p
    ));
  };

  const deleteProtocolo = (id: string) => {
    setProtocolos(prev => prev.filter(p => p.id !== id));
  };

  return (
    <ProtocolosContext.Provider value={{ protocolos, addProtocolo, updateProtocolo, deleteProtocolo }}>
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
