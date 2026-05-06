# Excluir sobras automáticas de avarias

## Contexto
A regra atual já foi alterada para que apenas protocolos de **inversão** gerem sobras automaticamente. Porém, existem **281 sobras antigas** ainda ativas no banco que foram criadas a partir de protocolos do tipo **AVARIA** (antes da mudança).

## Ação
Rodar uma migração que faz **soft-delete** (`ativo = false`) em todas as sobras (`tipo_reposicao = 'pos_rota'`) cuja origem (`protocolo_origem_id`) é um protocolo de avaria.

```sql
UPDATE protocolos s
SET ativo = false
FROM protocolos o
WHERE s.protocolo_origem_id = o.id
  AND s.tipo_reposicao = 'pos_rota'
  AND UPPER(o.tipo_reposicao) = 'AVARIA'
  AND s.ativo = true;
```

## Resultado esperado
- 281 sobras removidas da listagem em `/sobras`
- Protocolos de avaria originais permanecem intactos
- Nenhuma alteração de código necessária (a regra já foi corrigida anteriormente)
