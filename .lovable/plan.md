# Envio assíncrono de Alteração de Pedidos

Hoje o envio roda no navegador, com `sleep(10s)` entre cada linha. O usuário precisa ficar na aba aberta o tempo todo. A solução é mover o disparo para o backend: o site só **enfileira**, e um worker no servidor envia os webhooks no ritmo certo.

## Como vai funcionar

```text
[Navegador]
  1. Upload do CSV → chama edge function "enfileirar"
  2. Recebe lote_id e fecha (pode sair da página)
       │
       ▼
[Banco]
  alteracao_pedidos_lote   (1 linha por upload)
  alteracao_pedidos_log    (N linhas, status=pending, scheduled_at espaçado de 10s)
       ▲
       │  pg_cron a cada 1 min
[Edge Function "processar-fila-alteracoes"]
  3. Busca itens pending com scheduled_at <= now()
  4. Dispara webhook do n8n
  5. Marca como sent ou failed
       │
       ▼
[Navegador (Realtime)]
  Mostra "X de Y enviados" em tempo real,
  mesmo se o usuário recarregar ou voltar depois.
```

O intervalo de **10 segundos entre mensagens é mantido**, só que controlado no servidor, não no navegador.

## Mudanças no banco (1 migração)

**Nova tabela `alteracao_pedidos_lote`**
- nome do arquivo, total de itens, total enviados, total com erro, status (`processando` / `concluido`), quem disparou.

**Tabela `alteracao_pedidos_log` ganha colunas**
- `lote_id` (referência ao lote)
- `status` (`pending` / `sent` / `failed`)
- `scheduled_at` (quando o item pode ser disparado — usado para respeitar os 10s)
- `attempts` (contador de tentativas)
- `sent_at` (timestamp do envio efetivo)

**Realtime** habilitado em `alteracao_pedidos_log` para a UI atualizar sozinha.

**`pg_cron`** agendando `processar-fila-alteracoes` a cada 1 minuto.

## Mudanças no backend (2 Edge Functions novas)

**`enfileirar-alteracoes`**
- Recebe as linhas já parseadas do CSV.
- Cria 1 registro em `alteracao_pedidos_lote`.
- Insere todas as linhas em `alteracao_pedidos_log` com `status=pending` e `scheduled_at = now() + (i * 10s)`.
- Retorna `{ lote_id, total }` em menos de 1 segundo.

**`processar-fila-alteracoes`** (chamada pelo `pg_cron`)
- Pega até N itens `pending` com `scheduled_at <= now()`, ordenados por data agendada.
- Para cada item: dispara `POST` no webhook do n8n, marca como `sent` (ou `failed` com mensagem de erro e incrementa `attempts`).
- Atualiza os contadores no `alteracao_pedidos_lote`. Quando `enviados + falhas == total`, marca o lote como `concluido`.
- Idempotente: se o cron rodar enquanto outro ainda processa, usa `FOR UPDATE SKIP LOCKED` para não duplicar envios.

## Mudanças no frontend (`src/pages/AlteracaoPedidos.tsx`)

- Botão **"Processar e Enviar"** agora só:
  1. Faz parse do CSV (já existe).
  2. Chama `enfileirar-alteracoes` com as linhas.
  3. Mostra toast "Lote enfileirado, processando em segundo plano".
  4. Abre o painel de progresso do lote atual.
- Painel de progresso assina **Realtime** em `alteracao_pedidos_log` filtrado por `lote_id`. Mostra:
  - Barra de progresso (`enviados / total`).
  - Estimativa de término (`(total - enviados) * 10s`).
  - Lista de sucessos e erros, igual hoje.
- Nova aba **"Lotes recentes"**: lista os últimos lotes do usuário com status, progresso e data — permite reabrir um lote que ainda está rodando ou um já finalizado.
- O botão **Reenviar** individual continua funcionando: marca o item como `pending` de novo com `scheduled_at = now()` para o worker pegar no próximo tick.
- Remove o `sleep(10000)`, o `AbortController`, o `startPolling` e o "Parar Envio" (cancelamento ficou para depois).

## Detalhes técnicos relevantes

- O webhook do n8n continua sendo `https://n8n.revalle.com.br/webhook/alteracao_pedidos`, payload idêntico ao atual (incluindo `log_id` / `id_alteracao`), então **o n8n não precisa mudar**.
- `scheduled_at` espaçado garante o ritmo de 10s mesmo se o cron rodar de minuto em minuto: o worker pode disparar 6 itens por execução (60s / 10s) sem violar o intervalo.
- Tolerância a falhas: se o webhook falhar, item vira `failed` com `erro_mensagem`. Não há retry automático nesta versão (o usuário usa o botão "Reenviar" como hoje).
- `pg_cron` e `pg_net` precisam estar habilitados — a migração faz isso.
- O agendamento do cron é inserido via `supabase--insert` (não migração) porque contém URL e chave do projeto.

## Fora de escopo (combinado)

- Cancelar lote em andamento.
- Mudar o intervalo de 10s ou torná-lo configurável.
- Retry automático de itens com falha.
