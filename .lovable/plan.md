

# Fix: Importação de PDVs mostrando "novos" incorretamente

## Problema
A consulta que busca códigos existentes no banco usa o limite padrão do banco (1.000 linhas). A unidade RP tem ~15.788 PDVs, então apenas 1.000 códigos são comparados — os outros ~14.788 aparecem falsamente como "novos".

## Solução

### 1. `src/components/ImportarPdvsCSV.tsx` — função `enrichWithStatus`
Substituir a query única por um loop paginado que busca **todos** os códigos existentes da unidade, em lotes de 5.000 (buscando apenas a coluna `codigo` para ser leve):

```typescript
// Buscar TODOS os códigos existentes com paginação
let allCodigos: string[] = [];
let from = 0;
const pageSize = 5000;
while (true) {
  const { data } = await supabase
    .from('pdvs')
    .select('codigo')
    .eq('unidade', unidade.toUpperCase())
    .range(from, from + pageSize - 1);
  if (!data || data.length === 0) break;
  allCodigos.push(...data.map(p => String(p.codigo).trim()));
  if (data.length < pageSize) break;
  from += pageSize;
}
const existentesSet = new Set(allCodigos);
```

### 2. `src/hooks/usePdvsDB.ts` — função `importPdvsNovos`
Aplicar a mesma lógica paginada na busca de códigos existentes antes da comparação.

## Impacto
- Corrige a contagem de novos vs existentes no preview
- Evita inserir duplicatas no banco
- Query leve (só coluna `codigo`, ~16KB para 15k registros)

