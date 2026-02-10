
## Correção: Top 5 Produtos com valores estranhos

### Problema
Alguns produtos no banco de dados têm o campo `quantidade` armazenado como **texto** (string) ao invés de **numero** no JSONB. Quando o dashboard soma as quantidades usando o operador `+`, o JavaScript faz **concatenacao de texto** ao invés de soma matematica.

Exemplo: `0 + "1" + "2"` resulta em `"012"` ao inves de `3`.

Atualmente: **8 produtos** de **675** estao com este problema no banco.

---

### Plano de Correção

**1. Corrigir o codigo do Dashboard (prevenir o problema)**
- No calculo do Top 5 Produtos (`src/pages/Dashboard.tsx`, linha 291), converter `prod.quantidade` para numero usando `Number()` antes de somar:
  ```
  contagem[prod.nome] = (contagem[prod.nome] || 0) + Number(prod.quantidade);
  ```

**2. Corrigir os dados existentes no banco**
- Executar um UPDATE SQL para converter os 8 registros que tem `quantidade` como string para numero no JSONB, evitando problemas futuros.

**3. Prevenir novas ocorrencias**
- Revisar o formulario de criacao de protocolo (`AbrirProtocolo.tsx`) para garantir que `quantidade` sempre seja salvo como numero (usando `parseInt` ou `Number`).

---

### Detalhes Tecnicos

**Arquivo modificado:** `src/pages/Dashboard.tsx`
- Linha 291: adicionar `Number()` ao somar `prod.quantidade`

**Migracao SQL:** Corrigir os 8 registros existentes convertendo strings para numeros no array JSONB de produtos.

**Arquivo revisado:** `src/pages/AbrirProtocolo.tsx` - garantir que o campo quantidade seja numerico ao salvar.
