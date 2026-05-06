## Objetivo

Quando o usuário importar uma planilha de produtos e um `cod` já existir no banco, em vez de simplesmente ignorar, **atualizar o nome** (`produto`) com o valor do arquivo. A coluna `embalagem` permanece intocada para os existentes (não há essa info no CSV).

## Mudanças

### 1. `src/hooks/useProdutosDB.ts` — função `importProdutosNovos`
- Continuar buscando os existentes, mas agora trazendo `cod` **e** `produto`.
- Separar em três grupos:
  - **novos**: `cod` não existe → `INSERT` (igual hoje, com `embalagem: 'UN'`).
  - **atualizados**: `cod` existe **e** o nome do CSV é diferente do salvo → `UPDATE produtos SET produto = ... WHERE cod = ...` (um update por código; pode rodar em paralelo com `Promise.all`).
  - **inalterados**: `cod` existe e o nome é o mesmo → ignora silenciosamente.
- Retornar no `ImportResult` os novos campos `atualizados` e `inalterados` além de `inseridos`/`ignorados`.

### 2. `src/components/ImportarProdutosCSV.tsx`
- Ao buscar existentes para o preview, trazer também `produto` e marcar cada linha do CSV com um status entre três opções:
  - `novo` (badge azul como hoje)
  - `atualizar` (badge laranja/amarelo) — `cod` existe mas nome diferente
  - `inalterado` (badge cinza) — já existe igual
- Mostrar contadores no resumo: `X novos · Y para atualizar · Z inalterados`.
- Habilitar o botão "Importar" se houver novos **ou** atualizações.
- Texto do botão: `"Importar X novos e atualizar Y"` (ajustando plural/casos vazios).
- Mensagem de toast após sucesso refletindo os três totais.

### 3. Sem mudanças de schema
Não há migração: a tabela `produtos` já tem `cod` UNIQUE e a RLS permite `UPDATE` para usuários autenticados.

## Fora do escopo
- Não alterar `embalagem` em produtos existentes (continua só com a importação separada de embalagens, se houver).
- Comportamento de `importProdutos` (importação completa antiga, se ainda usada) permanece igual.
