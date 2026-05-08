## Recomendação

**Sim, recomendo — mas de forma faseada, não tudo de uma vez.**

Hoje o Dashboard baixa ~8.000 protocolos ativos no navegador a cada acesso e calcula tudo em JS. Funciona, mas:
- O `fetchSobrasStats` já tem `limit(1000)` — **acima de 1000 sobras as métricas ficam erradas** (bug latente).
- O payload cresce linearmente: em 6 meses pode dobrar e começar a travar em conexões fracas.
- Filtros de unidade/data são aplicados no cliente, então mesmo filtrando "Maio" o navegador baixa o histórico inteiro.

Por outro lado, mover **tudo** para RPC tem custo: o Dashboard tem rankings, gráficos por dia, lead time, contagem por causa, etc. Reescrever tudo de uma vez é arriscado e demorado. Por isso proponho começar pelos pontos que **mais doem** e deixar os agregados leves como estão.

---

## Plano faseado

### Fase 1 — Corrigir o bug das sobras e os contadores simples (prioridade alta)

Criar uma RPC única que devolve os totais "mastigados" para os cards do topo:

```
get_dashboard_resumo(
  p_unidades text[] default null,
  p_data_inicio text default null,
  p_data_fim text default null
)
```

Retorna em uma linha:
- `total_protocolos`, `abertos`, `em_andamento`, `encerrados`
- `sobras_total`, `sobras_pendente`, `sobras_andamento`, `sobras_resolvido`, `sobras_erro_carregamento`, `sobras_erro_entrega`
- `trocas_total`
- `lead_time_medio_dias`

Substitui `fetchSobrasStats`, `fetchTrocasStats` e os `useMemo` de contagem básica no `Dashboard.tsx`. Resolve o limite de 1000 e elimina ~4 queries.

### Fase 2 — Rankings e séries temporais (prioridade média)

Duas RPCs adicionais:

- `get_dashboard_top_pdvs(p_unidades, p_data_inicio, p_data_fim, p_limite)` — devolve os 5 PDVs com `codigo`, `nome` (via join com `pdvs`) e `total`. Elimina o segundo `fetch` que hoje busca os nomes depois.
- `get_dashboard_protocolos_por_dia(p_unidades, p_data_inicio, p_data_fim)` — devolve `data, abertos, encerrados` para o gráfico.

### Fase 3 — Cache leve no front (opcional)

`useQuery` (TanStack) com `staleTime: 60s` em cima das RPCs. Hoje cada navegação refaz tudo.

### O que **não** muda

- `useProtocolosDB` continua existindo: a página de Protocolos precisa da lista bruta.
- Filtros de unidade do usuário não-admin continuam aplicados (passados como parâmetro para a RPC).
- Causa "Erro de Carregamento / Entrega" continua sendo `ILIKE` no campo `causa`.

---

## Detalhes técnicos

- RPCs `LANGUAGE sql STABLE SECURITY DEFINER` com `SET search_path = public`, seguindo o padrão das funções já existentes (`count_protocolos_por_unidade`).
- Datas continuam como `text` no formato `DD/MM/YYYY` no banco — converter com `TO_DATE` dentro da RPC, igual ao que `count_protocolos_por_unidade` já faz.
- Índices a avaliar depois da Fase 1: `(ativo, tipo_reposicao, motorista_unidade)` e um btree em `TO_DATE(data,'DD/MM/YYYY')` se as RPCs ficarem lentas.
- Permissões: `GRANT EXECUTE ... TO authenticated` (não `anon`).
- Como são `SECURITY DEFINER`, o filtro de unidade do usuário **deve** vir como parâmetro do front (igual ao padrão atual), nunca confiar no que veio sem checagem.

---

## Esforço estimado

- Fase 1: ~1 sessão. Ganho imediato (bug das sobras + payload menor).
- Fase 2: ~1 sessão. Ganho de performance percebida.
- Fase 3: ~30 min. Ganho de fluidez ao navegar entre páginas.

**Minha recomendação**: aprovar **Fase 1 agora** (corrige bug real e dá retorno alto com pouco código) e decidir Fases 2/3 depois de medir o resultado.