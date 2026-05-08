## Objetivo

Na página **Alteração de Pedidos** → componente **Histórico de Envios**, restringir os registros exibidos para que cada usuário veja apenas os PDVs pertencentes à(s) sua(s) revenda(s)/unidade(s). Admins continuam vendo tudo.

## Como funciona hoje

`src/components/HistoricoEnvios.tsx` faz `select` em `alteracao_pedidos_log` sem filtro de unidade. A tabela `alteracao_pedidos_log` não possui coluna `unidade`, mas tem `cod_pdv` — e a tabela `pdvs` relaciona `(codigo, unidade)`.

O padrão de multi-unidade já usado em `Protocolos.tsx`:
```ts
const userUnidades = (user?.unidade || '').split(',').map(u => u.trim()).filter(Boolean);
const isAdmin = user?.nivel === 'admin';
```

## Mudanças

### `src/components/HistoricoEnvios.tsx`

1. Importar `useAuth` de `@/contexts/AuthContext`.
2. Obter `user` e `isAdmin` no componente.
3. Calcular `userUnidades` a partir de `user.unidade` (split por vírgula).
4. Em `fetchHistory()`:
   - Se **admin** ou `userUnidades` vazio → manter consulta atual (todos os logs).
   - Caso contrário:
     a. Buscar em `pdvs` os `codigo` cujo `unidade` esteja em `userUnidades` (mapear nome → código com `UNIDADE_MAP` igual ao `usePdvsBusca` se necessário; pelo padrão atual, `user.unidade` já é o código curto tipo `BF`, `PE`, etc., como nas demais páginas — usar direto).
     b. Aplicar `.in('cod_pdv', codigosDoUsuario)` na query de `alteracao_pedidos_log`.
     c. Se a lista de códigos vier vazia, exibir histórico vazio sem rodar a query.
5. Re-rodar `fetchHistory` quando `user?.unidade` mudar (adicionar ao `useEffect`).

### Sem mudanças em

- Backend / RLS (continua aberto, filtro é client-side, igual ao restante do app).
- Página `AlteracaoPedidos.tsx` (apenas o componente histórico precisa do filtro).
- Tabela `alteracao_pedidos_log` (não precisa de nova coluna).

## Comportamento final

- Admin: vê todos os envios (sucesso + erro).
- Usuário de unidade(s) específica(s): vê apenas envios cujos `cod_pdv` pertencem a alguma das suas unidades.
- Filtros de data e ações de reenviar/limpar/CSV continuam funcionando, agora restritos ao escopo do usuário.
