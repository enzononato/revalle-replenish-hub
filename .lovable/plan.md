

# Fix: Validação de unidade rejeitando "UND"

## Problema
A validação na edição de produtos aceita apenas `UN`, `CX`, `PCT`, mas:
1. O valor padrão ao adicionar novo produto é `'UND'` (linhas 195 e 222)
2. Existem produtos já salvos no banco com unidade `'UND'`

Resultado: mesmo selecionando tudo corretamente, se a unidade carregada do banco ou o default for `UND`, a validação falha.

## Solução

### Arquivo: `src/components/ProtocoloDetails.tsx`

1. **Corrigir defaults** — trocar `'UND'` por `'UN'` nas linhas 195 e 222
2. **Normalizar na validação** — antes de validar, converter `'UND'` para `'UN'` no `handleSalvarProdutos` (sanitização), para cobrir dados antigos do banco:
   ```
   unidade: produto.unidade === 'UND' ? 'UN' : produto.unidade
   ```

### Impacto
- Corrige o erro imediato ao editar produtos
- Produtos antigos com `UND` no banco serão salvos como `UN` ao serem editados

