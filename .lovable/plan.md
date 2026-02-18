
## Importar apenas produtos novos (código não existente)

### Problema atual

O componente `ImportarProdutosCSV` usa `upsert` com `ignoreDuplicates: false`, o que **atualiza** produtos que já existem. O usuário quer que apenas produtos com código **novo** sejam inseridos.

Além disso, o arquivo CSV enviado usa **ponto e vírgula** (`;`) como separador de colunas, o que precisa ser tratado corretamente.

---

### Mudanças planejadas

**1. `src/hooks/useProdutosDB.ts` — nova função `importProdutosNovos`**

Adicionar uma função que:
- Busca todos os códigos já existentes no banco (`cod`)
- Filtra da lista enviada apenas os produtos cujos códigos **não existem** ainda
- Insere somente os novos
- Retorna um resultado detalhado: `{ inseridos, ignorados, total }`

```
ImportResult expandido:
  success: boolean
  total: number       ← total do arquivo
  inseridos: number   ← novos inseridos
  ignorados: number   ← já existiam, pulados
  error?: string
```

**2. `src/components/ImportarProdutosCSV.tsx` — melhorias**

- Corrigir leitura de CSV com separador `;` (passar `FS: ';'` para o XLSX)
- Usar a nova função `importProdutosNovos` em vez de `importProdutos`
- Exibir no preview quantos produtos do arquivo já existem vs novos (com badge colorido por linha)
- Mostrar na mensagem de sucesso: "X novos produtos inseridos, Y já existiam e foram ignorados"
- O botão de importar mostrará: "Importar X produtos novos" (já filtrando a contagem)

---

### Fluxo detalhado

```text
[Usuário seleciona CSV]
        |
        v
[Frontend lê e parseia o arquivo]
        |
        v
[importProdutosNovos() é chamado]
        |
        v
[Busca todos os CODs existentes no banco]
        |
        v
[Filtra: apenas produtos com COD não encontrado]
        |
        v
[Insere somente os novos via INSERT]
        |
        v
[Retorna: inseridos=X, ignorados=Y]
```

---

### Arquivos a modificar

| Arquivo | O que muda |
|---|---|
| `src/hooks/useProdutosDB.ts` | Nova função `importProdutosNovos` que filtra por código antes de inserir |
| `src/components/ImportarProdutosCSV.tsx` | Fix do separador CSV (`;`), usa nova função, exibe distinção no preview e no feedback |

---

### Técnico — busca de códigos existentes

Como a tabela `produtos` pode ter muitos registros, a busca será feita pegando apenas a coluna `cod` (sem trazer todos os dados), e o filtro será feito em memória no cliente. Isso é eficiente pois o dado é leve (só texto de código).

```typescript
const { data } = await supabase.from('produtos').select('cod');
const existentes = new Set(data.map(p => p.cod.trim()));
const novos = produtos.filter(p => !existentes.has(p.cod.trim()));
```
