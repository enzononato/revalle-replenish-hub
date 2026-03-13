

## Plano: Tabela de log de envios + exibição de erros na página Alteração Pedidos

### Resumo

Criar uma tabela no banco para registrar cada envio ao webhook. O frontend insere um registro antes de enviar e, se o n8n detectar erro, ele atualiza a coluna `sucesso` para `false` via nó Supabase. A página então consulta essa tabela para mostrar quais linhas deram erro.

### 1. Criar tabela `alteracao_pedidos_log`

```sql
CREATE TABLE public.alteracao_pedidos_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  cod_pdv text NOT NULL,
  nome_pdv text,
  telefone_pdv text,
  status_pedido text,
  mensagem_cliente text,
  sucesso boolean NOT NULL DEFAULT true,
  erro_mensagem text,
  enviado_por text
);

ALTER TABLE public.alteracao_pedidos_log ENABLE ROW LEVEL SECURITY;

-- Leitura para autenticados
CREATE POLICY "Autenticados podem ler alteracao_pedidos_log"
  ON public.alteracao_pedidos_log FOR SELECT TO authenticated
  USING (true);

-- Inserção para autenticados (frontend)
CREATE POLICY "Autenticados podem inserir alteracao_pedidos_log"
  ON public.alteracao_pedidos_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- Update público (para o n8n atualizar via anon key)
CREATE POLICY "Update público alteracao_pedidos_log"
  ON public.alteracao_pedidos_log FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);
```

### 2. Fluxo de envio (frontend)

Em `src/pages/AlteracaoPedidos.tsx`:

1. Antes de chamar o webhook, inserir registro na tabela com `sucesso = true` (otimista)
2. Enviar ao webhook incluindo o `id` do registro no payload para o n8n poder referenciar
3. Após o loop, buscar os registros do lote e mostrar os que têm `sucesso = false`
4. Adicionar um card de resumo abaixo mostrando linhas com erro (cod_pdv, nome, erro_mensagem)
5. Adicionar botão "Atualizar status" para re-consultar a tabela e verificar atualizações do n8n

### 3. Lado do n8n

O n8n recebe o payload com o `id` do registro. Se houver erro no processamento, o n8n usa o nó Supabase para:
```sql
UPDATE alteracao_pedidos_log SET sucesso = false, erro_mensagem = '...' WHERE id = '...'
```

### Arquivos alterados
- **Migration SQL** — criar tabela `alteracao_pedidos_log`
- **`src/pages/AlteracaoPedidos.tsx`** — inserir registros, incluir `id` no payload do webhook, exibir card de erros com consulta à tabela

