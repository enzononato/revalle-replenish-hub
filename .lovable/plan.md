
# Reposicao Parcial - Entrega parcial de produtos

## Resumo
Adicionar a funcionalidade de "reposicao parcial", onde o motorista pode selecionar quais produtos entregar ao encerrar um protocolo. O protocolo so sera encerrado de verdade quando TODOS os produtos forem entregues.

## Como vai funcionar

1. **No encerramento pelo motorista**: Em vez de encerrar tudo de uma vez, o motorista vera a lista de produtos e podera selecionar quais esta entregando naquele momento (com checkboxes).

2. **Entrega parcial**: Se o motorista selecionar apenas alguns produtos, o protocolo permanece com status `em_andamento` e os produtos entregues sao marcados como tal.

3. **Entrega total**: Quando todos os produtos forem entregues (naquela ou em entregas anteriores), o protocolo e encerrado automaticamente (status `encerrado`).

4. **Nos detalhes do protocolo (admin)**: A tabela de produtos ganha uma coluna "Entregue" com indicador visual (check verde = entregue, X vermelho = pendente), alem da data da entrega.

## Alteracoes Tecnicas

### 1. Tipo Produto (src/types/index.ts)
Adicionar campos ao tipo `Produto`:
- `entregue?: boolean` - se o produto ja foi entregue
- `dataEntrega?: string` - data/hora da entrega
- `entregaPorMotoristaId?: string` - ID do motorista que entregou
- `entregaPorMotoristaNome?: string` - nome do motorista que entregou

### 2. Modal de Encerramento (src/components/motorista/EncerrarProtocoloModal.tsx)
- Exibir lista de produtos com checkboxes para o motorista selecionar quais esta entregando
- Produtos ja entregues anteriormente aparecem desabilitados com visual de "ja entregue"
- O botao muda de "Confirmar Encerramento" para "Confirmar Entrega" quando for parcial
- Ao confirmar:
  - Se todos os produtos (pendentes + selecionados) ficarem entregues: status muda para `encerrado`
  - Se ainda restarem pendentes: status permanece `em_andamento`, e os produtos selecionados sao marcados como entregues no array JSON de produtos

### 3. Detalhes do Protocolo (src/components/ProtocoloDetails.tsx)
- Na tabela de produtos, adicionar coluna "Status" com badge visual:
  - Verde com check: "Entregue" + data
  - Amarelo com relogio: "Pendente"
- Adicionar um resumo acima da tabela: "X de Y produtos entregues"

### 4. Meus Protocolos - motorista (src/components/motorista/MeusProtocolos.tsx)
- Na lista expandida de produtos, mostrar quais ja foram entregues
- Indicador visual de progresso (ex: "2 de 5 entregues")

### 5. Log de auditoria
- Cada entrega parcial gera um log com acao "Entrega parcial" listando quais produtos foram entregues
- Entrega final gera log "Encerrou o protocolo (entrega final)"

### Nenhuma alteracao no banco de dados
Os campos de entrega serao armazenados dentro do JSON `produtos` (campo JSONB), entao nao e necessario criar colunas novas na tabela `protocolos`.
