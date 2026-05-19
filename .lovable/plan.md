
## Objetivo

Mover a geração do `protocolos.numero` para o backend, com unicidade garantida e prefixo derivado do tipo de protocolo.

## Formato final

```
{PREFIXO}-{AAAAMMDDHHMMSS}{NN}
```
- `AAAAMMDDHHMMSS` = timestamp UTC-3 (America/Sao_Paulo) no momento da geração.
- `NN` = 2 dígitos aleatórios (00–99).
- Exemplo: `RPA-2026051914305247`.

## Mapa de prefixos

| Origem | `p_tipo` | `p_causa` | Prefixo |
|---|---|---|---|
| Reposição – Avaria | `reposicao` | `avaria` | **RPA** |
| Reposição – Falta | `reposicao` | `falta` | **RPF** |
| Reposição – Inversão | `reposicao` | `inversao` | **RPI** |
| Reposição – outras causas | `reposicao` | qualquer outra | **RP** + primeira letra da causa (uppercase, sem acento) |
| Pós-Rota / Sobra | `pos_rota` | — | **POSROTA** |
| Troca (RN) | `troca` | — | **TROCA** |
| Vendedor (futuro mobile) | `venda` | — | **VENDA** |
| Sobra automática de inversão | `sobra_auto` | — | `${numero_origem}-S` (mantém regra atual) |

A função normaliza `p_causa` (UPPER + unaccent) para gerar a inicial.

## Mudanças no banco (migration)

1. **RPC** `public.generate_protocolo_numero(p_tipo text, p_causa text default null) returns text`:
   - `SECURITY DEFINER`, `search_path = public`.
   - Calcula prefixo conforme tabela acima.
   - Loop com até 10 tentativas: gera `numero` candidato → verifica `SELECT 1 FROM protocolos WHERE numero = candidato` → retorna na 1ª livre.
   - Se 10 tentativas falharem, levanta exceção (extremamente improvável).
2. **Unique index** `CREATE UNIQUE INDEX protocolos_numero_unique ON public.protocolos (numero);`
   - Caso a migration falhe por duplicidade pré-existente, eu listo as duplicatas para você decidir como tratar antes de seguir.
3. **GRANT EXECUTE** da função para `anon, authenticated` (front-end consome via `supabase.rpc`).

## Mudanças no frontend

Remover a geração local de `numero` em:
- `src/pages/AbrirProtocolo.tsx`
- `src/components/CreateProtocoloModal.tsx`
- `src/pages/MotoristaPortal.tsx` (avaria/inversão)
- `src/components/motorista/PosRota.tsx`
- `src/components/rn/TrocaForm.tsx`
- `src/utils/criarSobraDeProtocolo.ts` (continua com sufixo `-S` do número original — não usa RPC)

Em cada ponto, substituir por:
```ts
const { data: numero, error } = await supabase.rpc('generate_protocolo_numero', {
  p_tipo: 'reposicao',   // ou 'pos_rota' / 'troca' / 'venda'
  p_causa: causa ?? null // só relevante para reposicao
});
if (error || !numero) throw error ?? new Error('Falha ao gerar número');
```

Não existe nenhum outro caminho de criação de protocolo no app (varrido na investigação anterior), então com isso 100% dos novos números passam pelo backend.

## Compatibilidade

- Números antigos (PROTOC-/POSROTA-/TROCA-) continuam válidos — a UNIQUE não os altera.
- Webhooks e n8n recebem `numero` no payload exatamente como hoje, só muda o prefixo.
- Tipos TypeScript de `src/integrations/supabase/types.ts` são regenerados após a migration (automático).

## Verificação pós-deploy

- Abrir 1 protocolo de cada tipo no preview e conferir o prefixo gerado.
- Conferir no banco `SELECT numero FROM protocolos ORDER BY created_at DESC LIMIT 5;`.

