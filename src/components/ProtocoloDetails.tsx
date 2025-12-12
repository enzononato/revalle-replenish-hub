import { Protocolo } from '@/types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  Download, 
  User, 
  Building2, 
  Package, 
  Image, 
  MessageSquare,
  FileText,
  Clock
} from 'lucide-react';
import { useState } from 'react';

interface ProtocoloDetailsProps {
  protocolo: Protocolo | null;
  open: boolean;
  onClose: () => void;
}

export function ProtocoloDetails({ protocolo, open, onClose }: ProtocoloDetailsProps) {
  const [habilitarReenvio, setHabilitarReenvio] = useState(protocolo?.habilitarReenvio || false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!protocolo) return null;

  const handleDownload = () => {
    const content = `
DETALHES DO PROTOCOLO
=====================

PROTOCOLO: ${protocolo.numero}
DATA: ${protocolo.data}
HORA: ${protocolo.hora}
STATUS: ${protocolo.status.toUpperCase()}

TIPO DE REPOSIÇÃO: ${protocolo.tipoReposicao || '-'}
CAUSA: ${protocolo.causa || '-'}
UNIDADE: ${protocolo.unidadeNome || '-'} (ID ${protocolo.unidadeId || '-'})

DADOS DO MOTORISTA
------------------
Motorista: ${protocolo.motorista.codigo}
Nome: ${protocolo.motorista.nome}
E-mail: ${protocolo.motorista.email || '-'}
WhatsApp: ${protocolo.motorista.whatsapp}

INFORMAÇÕES DO CLIENTE
----------------------
Código PDV: ${protocolo.codigoPdv || '-'}
MAPA: ${protocolo.mapa || '-'}
Nota Fiscal: ${protocolo.notaFiscal || '-'}

OBSERVAÇÃO
----------
${protocolo.observacaoGeral || '-'}

PRODUTOS RECEBIDOS
------------------
${protocolo.produtos?.map(p => 
  `${p.codigo} | ${p.nome} | ${p.unidade} | Qtd: ${p.quantidade} | Val: ${p.validade} | Obs: ${p.observacao || '-'}`
).join('\n') || 'Nenhum produto'}

HISTÓRICO DE OBSERVAÇÕES
------------------------
${protocolo.historicoObservacoes?.map(o => 
  `${o.data} ${o.hora} - ${o.texto}`
).join('\n') || 'Nenhum histórico'}

STATUS DO PROTOCOLO
-------------------
Validado: ${protocolo.validacao ? 'Sim' : 'Não'}
Lançado: ${protocolo.lancado ? 'Sim' : 'Não'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${protocolo.numero}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <FileText className="text-primary" size={24} />
              Detalhes do Protocolo
            </DialogTitle>
            <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2">
              <Download size={16} />
              Download
            </Button>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Status do Protocolo */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <CheckCircle size={16} />
                Status do Protocolo
              </h3>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  {protocolo.validacao ? (
                    <CheckCircle className="text-success" size={18} />
                  ) : (
                    <XCircle className="text-muted-foreground" size={18} />
                  )}
                  <span className="text-sm">Validado: <strong>{protocolo.validacao ? 'Sim' : 'Não'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  {protocolo.lancado ? (
                    <CheckCircle className="text-success" size={18} />
                  ) : (
                    <XCircle className="text-muted-foreground" size={18} />
                  )}
                  <span className="text-sm">Lançado: <strong>{protocolo.lancado ? 'Sim' : 'Não'}</strong></span>
                </div>
              </div>
            </div>

            {/* Informações Gerais */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Clock size={16} />
                Informações Gerais
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Protocolo</p>
                  <p className="font-medium text-sm">{protocolo.numero}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium text-sm">{protocolo.data}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hora</p>
                  <p className="font-medium text-sm">{protocolo.hora}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={protocolo.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Reposição</p>
                  <p className="font-medium text-sm">{protocolo.tipoReposicao || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Causa</p>
                  <p className="font-medium text-sm">{protocolo.causa || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unidade</p>
                  <p className="font-medium text-sm">{protocolo.unidadeNome || '-'} (ID {protocolo.unidadeId || '-'})</p>
                </div>
              </div>
            </div>

            {/* Dados do Motorista */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <User size={16} />
                Dados do Motorista
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Motorista</p>
                  <p className="font-medium text-sm">{protocolo.motorista.codigo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium text-sm">{protocolo.motorista.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="font-medium text-sm">{protocolo.motorista.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <p className="font-medium text-sm">{protocolo.motorista.whatsapp}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">Habilitar Reenvio?</p>
                  <Switch 
                    checked={habilitarReenvio} 
                    onCheckedChange={setHabilitarReenvio} 
                  />
                </div>
              </div>
            </div>

            {/* Informações do Cliente */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Building2 size={16} />
                Informações do Cliente
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Código PDV</p>
                  <p className="font-medium text-sm">{protocolo.codigoPdv || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MAPA</p>
                  <p className="font-medium text-sm">{protocolo.mapa || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nota Fiscal</p>
                  <p className="font-medium text-sm">{protocolo.notaFiscal || '-'}</p>
                </div>
              </div>
            </div>

            {/* Observação */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquare size={16} />
                Observação
              </h3>
              <p className="text-sm">{protocolo.observacaoGeral || '-'}</p>
            </div>

            {/* Produtos Recebidos */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Package size={16} />
                Produtos Recebidos
              </h3>
              {protocolo.produtos && protocolo.produtos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-muted-foreground font-medium">Código</th>
                        <th className="text-left p-2 text-muted-foreground font-medium">Produto</th>
                        <th className="text-left p-2 text-muted-foreground font-medium">Unidade</th>
                        <th className="text-center p-2 text-muted-foreground font-medium">Qtd</th>
                        <th className="text-left p-2 text-muted-foreground font-medium">Validade</th>
                        <th className="text-left p-2 text-muted-foreground font-medium">Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {protocolo.produtos.map((produto, index) => (
                        <tr key={index} className="border-b border-border/50">
                          <td className="p-2 font-mono">{produto.codigo}</td>
                          <td className="p-2">{produto.nome}</td>
                          <td className="p-2">{produto.unidade}</td>
                          <td className="p-2 text-center font-medium">{produto.quantidade}</td>
                          <td className="p-2">{produto.validade}</td>
                          <td className="p-2 text-muted-foreground">{produto.observacao || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum produto registrado</p>
              )}
            </div>

            {/* Fotos Enviadas */}
            {protocolo.fotos && protocolo.fotos.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <Image size={16} />
                  Fotos Enviadas
                </h3>
                <div className="flex flex-wrap gap-3">
                  {protocolo.fotos.map((foto, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(foto)}
                      className="w-20 h-20 rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors"
                    >
                      <img 
                        src={foto} 
                        alt={`Foto ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Histórico de Observações */}
            {protocolo.historicoObservacoes && protocolo.historicoObservacoes.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Histórico de Observações
                </h3>
                <div className="space-y-2">
                  {protocolo.historicoObservacoes.map((obs) => (
                    <div key={obs.id} className="flex gap-3 text-sm">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {obs.data} {obs.hora}
                      </span>
                      <span className="text-muted-foreground">—</span>
                      <span>{obs.texto}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Foto ampliada" 
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
