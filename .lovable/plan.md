
## Melhorar Busca de PDVs e Produtos no Portal do Motorista

### Problemas identificados

**1. PDVs com código de 1 dígito não aparecem**
O hook `usePdvsBusca` tem esta condição:
```typescript
if (termo.length < 2 || !unidade) {
  setPdvs([]);
  return;
}
```
Quando o motorista digita `5` ou `9` (códigos de 1 dígito, confirmados no banco), a busca é bloqueada antes mesmo de consultar o banco. A solução é tratar o caso especialmente: se o termo tiver apenas 1 caractere **e for numérico**, a busca deve acontecer normalmente buscando pelo código exato.

**2. PDVs não ordenados por código**
A query não tem `.order()`, então os resultados vêm em ordem arbitrária. A ordenação pelo código deve ser numérica (1, 2, 5, 9, 11...) e não alfabética (1, 10, 11, 2, 5...). Isso é resolvido com `.order('codigo', { ascending: true })` — como o campo é texto, será ordenado como texto, então faremos ordenação no lado do cliente convertendo para número.

**3. Poucos produtos no resultado**
O limite atual é `10` para produtos. Aumentar para `30` para o motorista ter mais opções visíveis no autocomplete.

---

### Mudanças técnicas

**Arquivo: `src/hooks/usePdvsBusca.ts`**

1. Alterar a condição de guarda:
   - Antes: `if (termo.length < 2 || !unidade)`
   - Depois: `if ((termo.length < 1) || (termo.length < 2 && isNaN(Number(termo))) || !unidade)`
   - Ou seja: termos numéricos de 1 dígito passam; termos de texto ainda exigem mínimo 2 caracteres.

2. Adicionar ordenação no lado do cliente após receber os dados:
   ```typescript
   const sorted = (data || []).sort((a, b) => {
     const numA = parseInt(a.codigo, 10);
     const numB = parseInt(b.codigo, 10);
     if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
     return a.codigo.localeCompare(b.codigo);
   });
   setPdvs(sorted);
   ```

3. Aumentar o limite de `10` para `20` para PDVs.

**Arquivo: `src/hooks/useProdutosBusca.ts`**

1. Aumentar o limite de `10` para `30` para produtos.

---

### Resumo do impacto

| Problema | Causa | Solução |
|---|---|---|
| Código PDV de 1 dígito não aparece | Mínimo de 2 caracteres bloqueava a busca | Permitir 1 caractere se for numérico |
| PDVs sem ordem | Nenhum `.order()` na query | Ordenação numérica no cliente |
| Poucos produtos | Limite de 10 | Aumentar para 30 |
