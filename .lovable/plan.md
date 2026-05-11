## Objetivo

Criar um novo perfil **CME** que faz login pelo sistema interno (email/senha), porém com acesso muito restrito: vê apenas uma única tela onde pesquisa por **código do PDV** e lista todos os protocolos daquele PDV (reposição, sobras e trocas), com permissão de **reenvio** igual ao RN. Não vê dashboard, não vê outras páginas.

## 1. Banco de dados

- Adicionar `'cme'` ao enum `app_role` (já usado por `user_roles.role` e por `user_profiles.nivel`).
- Não precisa de tabela nova — CME usa `user_profiles` + `user_roles` como qualquer usuário interno.
- Sem alteração em RLS de `protocolos` (já é leitura pública para autenticados).

## 2. Tipos e Auth no frontend

- `src/types/index.ts`: adicionar `'cme'` em `UserRole`.
- `AuthContext` / hook de role: incluir `cme` na resolução de role (mesma lógica que admin/distribuicao/etc.).
- `ProtectedRoute`: aceita `'cme'` quando listado em `allowedRoles`.

## 3. Roteamento e redirecionamento pós-login

- Em `App.tsx`, após login, se `user.nivel === 'cme'` redirecionar para `/cme/portal`. Bloquear acesso a `/dashboard`, `/protocolos`, etc. (o `MainLayout` redireciona CME para `/cme/portal`).
- Nova rota protegida `/cme/portal` (allowedRoles: `['cme', 'admin']` — admin pode visualizar para suporte).

## 4. Sidebar

- `src/components/layout/Sidebar.tsx`: como CME só tem uma tela, ocultar a sidebar inteira para esse perfil **ou** mostrar apenas o item "Buscar por PDV" + perfil/sair.
- Decisão: ocultar sidebar e usar header próprio (mesmo padrão visual do RN), para reforçar o escopo restrito.

## 5. Página `/cme/portal`

Nova página `src/pages/CmePortal.tsx`, inspirada em `RnPortal.tsx`:

- Campo de busca por **código do PDV** (input + botão Pesquisar). Sem outros filtros.
- Ao pesquisar, faz query em `protocolos`:
  - `eq('codigo_pdv', codigo)`
  - `eq('ativo', true)`
  - `eq('oculto', false)` (ou `or` para null)
  - **Sem** filtro de `motorista_unidade` (CME enxerga todas as unidades)
  - **Sem** filtro de `tipo_reposicao` (inclui reposição, `pos_rota` e `troca`)
  - Ordenar por `created_at DESC`
- Resultado em tabela/cards com colunas: número, data/hora, status, tipo (reposição/sobra/troca), motorista, unidade, NF.
- Tabs por status: Abertos, Em andamento, Encerrados, Todos.
- Clique em uma linha abre modal de detalhes (reaproveitar `ProtocoloDetails` em modo somente leitura) com botão **Reenviar** quando aplicável (reaproveitar `RnReenvioModal` — ele já é genérico).
- Header com nome do usuário CME, botão Sair (logout do AuthContext padrão).

## 6. Cadastro de usuários CME

- Em `src/pages/Usuarios.tsx`, adicionar `'cme'` à lista de níveis disponíveis no formulário (select).
- Edge function `create-user` já trata roles via parâmetro — só precisa aceitar o novo valor (validar enum lá dentro).
- Badge do nível em Sidebar/`getRoleBadge`: rótulo "CME".

## 7. Mensagens / textos

- Login usa o mesmo `/login` e mesmas mensagens.
- Portal CME: título "Buscar Protocolos por PDV" e instrução curta no topo.

## Detalhes técnicos

- Não criar nova edge function de login — CME usa Supabase Auth normal.
- Não mexer em RLS — `protocolos` já permite leitura para `authenticated`.
- Migration necessária: `ALTER TYPE app_role ADD VALUE 'cme';`
- Cuidado: `ALTER TYPE ... ADD VALUE` não pode rodar dentro de transação em algumas versões; rodar em migration isolada.
- `Sidebar.tsx`: condicional `if (user?.nivel === 'cme') return null;` (ou render mínimo).
- `MainLayout.tsx`: se `user.nivel === 'cme'` e rota não for `/cme/*`, redirecionar para `/cme/portal`.
- `Login.tsx`: ajustar redirect pós-login para enviar CME diretamente para `/cme/portal`.
- Reuso de componentes: `RnReenvioModal` já é parametrizado por protocolo; `ProtocoloDetails` aceita modo leitura.

## Fora de escopo

- Não criar relatórios/exportação para CME.
- Não permitir edição, encerramento, criação de trocas/sobras pelo CME.
- Não criar tabela `cme_users` nem edge function dedicada.
