
## Lead Time no Dashboard

### O que e
Lead Time e o **tempo medio de resolucao** (em dias) dos protocolos encerrados. Sera calculado usando a diferenca entre a data de abertura e a data de encerramento de cada protocolo encerrado.

### Onde vai aparecer
Um novo **StatCard** sera adicionado na primeira fileira de cards (junto com "Em Aberto", "Encerrados Hoje", etc.), mudando o grid de 5 para 6 colunas. O card mostrara o valor em formato "X dias" com o icone de cronometro (Timer).

### Como sera calculado
- Filtrar apenas protocolos com status `encerrado`
- Para cada um, calcular a diferenca em dias entre a data de abertura e a data de encerramento (extraida do `observacoesLog`)
- Calcular a media e arredondar para 1 casa decimal
- Se nao houver protocolos encerrados, exibir "—"

### Detalhes tecnicos

**Arquivo:** `src/pages/Dashboard.tsx`

1. **Novo `useMemo` para Lead Time** — Calcular a media de dias de resolucao dos protocolos encerrados, reutilizando a funcao `calcularSlaDias` que ja existe no arquivo (linha 361).

2. **Ajustar o grid dos StatCards** — Alterar de `lg:grid-cols-5` para `lg:grid-cols-6` na linha 544.

3. **Adicionar novo StatCard** — Inserir um card com:
   - Titulo: "Lead Time"
   - Valor: media calculada + " dias" (ex: "3.2 dias")
   - Icone: `Timer` (ja importado)
   - Variante: `default` ou `info`
   - Posicao: apos "Encerrados Hoje"
