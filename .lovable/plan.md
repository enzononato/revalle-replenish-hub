

## Plan: Ação "Enviar para Estoque" em Sobras de Erro de Carregamento

### Context
Quando a causa da sobra é "Erro de Carregamento", significa que o produto foi carregado a mais no caminhão. O perfil Controle precisa registrar o apontamento de que esse produto foi devolvido ao armazém/estoque. Atualmente, o fluxo só tem "Tratar" e "Resolver" — falta uma ação intermediária específica para esse tipo.

### What will be built

1. **Novo botão "Enviar p/ Estoque"** na tabela e no modal de detalhes da página Sobras, visível apenas quando a causa contém "ERRO DE CARREGAMENTO" e o status não é "encerrado".

2. **Ao clicar**, o sistema:
   - Altera o status para `encerrado`
   - Registra no `observacoes_log` uma entrada específica: "Produto devolvido ao estoque"
   - Registra no `audit_logs` a ação `devolvido_estoque`
   - Exibe toast de confirmação

3. **Badge visual** — Sobras resolvidas com essa ação ganham uma indicação diferenciada no histórico (ex: "Devolvido ao estoque" em vez de genérico "Resolvido").

### Technical Details

**File: `src/pages/Sobras.tsx`**

- Add a new handler `handleDevolverEstoque(sobra)` similar to `handleStatusChange` but with specific log text: "Produto devolvido ao estoque — Erro de carregamento"
- In the table actions column, add a conditional button with `Warehouse` icon (from lucide) when `causa` includes "ERRO DE CARREGAMENTO" and status is not `encerrado`
- In the detail modal actions section, add the same button
- The action sets status to `encerrado` and logs the specific action type

**No database changes needed** — the existing `observacoes_log` JSONB and `audit_logs` table handle this.

