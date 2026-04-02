

# Fix: Paginação de PDVs usando pageSize maior que o limite do servidor

## Problema
O `pageSize` está configurado como `5000`, mas o servidor limita respostas a **1000 linhas**. Quando a query retorna 1000 registros, o código interpreta `1000 < 5000` como "acabou os dados" e para o loop. Resultado: só 1000 dos 15.788 códigos são comparados.

## Solução
Reduzir o `pageSize` para `1000` em ambos os arquivos para alinhar com o limite do servidor.

### Arquivo 1: `src/components/ImportarPdvsCSV.tsx` — `enrichWithStatus`
- Linha 109: `const pageSize = 5000;` → `const pageSize = 1000;`

### Arquivo 2: `src/hooks/usePdvsDB.ts` — `importPdvsNovos`
- Mesma mudança: `const pageSize = 5000;` → `const pageSize = 1000;`

## Por que funciona
Com `pageSize = 1000`, quando a query retorna exatamente 1000 registros, o loop sabe que **pode haver mais** e continua buscando. Quando retorna menos de 1000, sabe que acabou. Isso garante que todos os 15.788 códigos da unidade RP sejam carregados antes da comparação.

