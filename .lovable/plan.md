# Ajustes na página Alteração de Pedidos

Dois ajustes pequenos de UI em `src/pages/AlteracaoPedidos.tsx`:

## 1. Texto do botão

Trocar **"Enfileirar e Enviar em Segundo Plano"** por simplesmente **"Enviar"**.

Durante o envio (`isEnqueuing = true`), o botão mostra **"Enviando..."** com o spinner.

## 2. Barra de progresso em tempo real, mais destacada

Hoje o progresso já existe dentro do card "Lote em andamento" e atualiza via Realtime. Vou:

- Mover a barra de progresso para o **topo do card**, em destaque, sempre visível enquanto o lote está em andamento.
- Mostrar acima da barra: `X de Y enviados (Z%)` em fonte maior.
- Mostrar abaixo: tempo estimado restante (`pendentes × 10s`, formatado em min) e contadores enviados / erros / na fila.
- Manter a lista detalhada de itens (erros, fila, sucessos) abaixo, como hoje.
- A barra continua atualizando sozinha via Realtime — sem precisar recarregar.

Nada muda no backend, nas tabelas ou nas edge functions.
