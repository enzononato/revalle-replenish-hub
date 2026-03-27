
Objetivo: corrigir o problema “não entra em nenhuma tela” com foco em resiliência de autenticação (Admin, Motorista e RN), já que os logs mostram falhas intermitentes de backend (timeouts 500/504 e `context canceled`) em `/token` e nas funções de login.

1) Consolidar tratamento de erro de rede/timeout nos 3 fluxos de login
- Criar um util único (ex.: `src/lib/authErrorHandling.ts`) para:
  - classificar erros de timeout, indisponibilidade e credenciais inválidas;
  - padronizar mensagens amigáveis para UI;
  - evitar mensagens genéricas (“Failed to fetch”).
- Aplicar em:
  - `src/contexts/AuthContext.tsx` (login admin)
  - `src/contexts/MotoristaAuthContext.tsx`
  - `src/contexts/RnAuthContext.tsx`

2) Adicionar retry controlado para falhas transitórias
- Implementar retry curto com backoff (ex.: 2 tentativas adicionais) apenas para erros de rede/timeout.
- Não aplicar retry para credencial inválida.
- Garantir que `isLoading` sempre finalize, mesmo com exceções encadeadas.

3) Melhorar feedback visual nas telas de login
- Em `src/pages/Login.tsx`, `src/pages/MotoristaLogin.tsx`, `src/pages/RnLogin.tsx`:
  - trocar mensagem única de erro por textos específicos:
    - “credenciais inválidas”
    - “sistema instável, tente novamente em instantes”
  - incluir botão “Tentar novamente” mantendo os campos preenchidos.
- Resultado esperado: usuário entende se é erro dele ou instabilidade do sistema.

4) Fortalecer chamadas das funções de login (Motorista/RN)
- Ajustar CORS headers das funções para o conjunto completo recomendado, reduzindo risco de falha de preflight em navegadores/SDKs novos.
  - `supabase/functions/motorista-login/index.ts`
  - `supabase/functions/rn-login/index.ts`
- Manter retorno estruturado `{ success: false, error: '...' }` para UX consistente.

5) Instrumentação mínima para diagnóstico contínuo
- Adicionar logs de erro no cliente com contexto do fluxo (`admin`, `motorista`, `rn`) e tipo classificado do erro.
- Não expor detalhes sensíveis ao usuário final.
- Facilita identificar se a próxima falha é de autenticação, função ou indisponibilidade do backend.

Arquivos previstos
- `src/lib/authErrorHandling.ts` (novo)
- `src/contexts/AuthContext.tsx`
- `src/contexts/MotoristaAuthContext.tsx`
- `src/contexts/RnAuthContext.tsx`
- `src/pages/Login.tsx`
- `src/pages/MotoristaLogin.tsx`
- `src/pages/RnLogin.tsx`
- `supabase/functions/motorista-login/index.ts`
- `supabase/functions/rn-login/index.ts`

Critérios de aceite
- Nenhum login fica preso em “Entrando...” indefinidamente.
- Em cenário de timeout, usuário recebe mensagem clara de instabilidade e consegue tentar novamente sem recarregar.
- Em credencial inválida, mensagem específica aparece sem retry desnecessário.
- Fluxos Admin, Motorista e RN exibem comportamento consistente.

Detalhes técnicos (resumo)
- Causa observada: falhas intermitentes de infraestrutura (timeouts no auth/token e consultas nas funções), não um único bug de tela.
- Estratégia: tornar o front resiliente a indisponibilidade transitória e reduzir “Failed to fetch” opaco.
- Sem mudanças de schema/migração nesta etapa; foco em robustez de autenticação e UX de erro.
