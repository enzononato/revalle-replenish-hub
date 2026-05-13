## Mudanças

### 1. Confirmação: envios já são salvos
Todo item enviado pela página *Alteração nos Pedidos* (sucesso ou erro) já é gravado em `alteracao_pedidos_log` pela edge function `processar-fila-alteracoes` e aparece automaticamente no Histórico de Envios. Nada a alterar.

### 2. Visualização para distribuicao / controle
Mantém-se o filtro atual por unidade (não-admin vê apenas registros dos PDVs da própria unidade). A UI já é idêntica à do admin — todos os filtros (datas, cód. PDV, telefone, status), tabelas e botões são renderizados para todos os perfis com acesso (admin, distribuicao, controle). Nada a alterar.

### 3. Novo botão "CSV" para enviados com sucesso
Em `src/components/HistoricoEnvios.tsx`, no card "Enviados com Sucesso", adicionar um botão **CSV** (mesmo estilo do botão de erros), que:
- Exporta `successLogs` (respeitando o filtro de datas aplicado na busca).
- Colunas: Data, Cod. PDV, Nome PDV, Telefone PDV, Status Pedido, Mensagem Cliente.
- Nome do arquivo: `enviados_sucesso_YYYY-MM-DD_HHmm.csv`.
- Desabilitado quando não há sucessos.

Reaproveita o mesmo padrão de geração CSV (BOM UTF-8 + aspas duplas escapadas) já usado para erros.

## Observações
- Os filtros de data já existem no header do Histórico — eles continuam controlando o que entra no CSV (porque a exportação usa os logs já carregados em memória).
- Nenhuma mudança em RLS, edge functions, banco ou rotas.