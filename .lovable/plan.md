
Objetivo: remover completamente a funcionalidade de chat da aplicação, incluindo página de chat, logs, atalhos de “Discutir Protocolo”, alerta para distribuição, bubble flutuante, contadores de não lidas e dependências de presença/realtime no frontend.

1. Escopo de remoção no frontend
- Remover a rota `/chat` do `App.tsx`.
- Remover a rota `/logs-chat` do `App.tsx`.
- Excluir a importação e uso da página `Chat`.
- Excluir a importação e uso da página `LogsChat`.
- Remover o item “Chat” do menu lateral.
- Remover o item “Logs de Chat” do menu lateral.
- Remover qualquer badge de mensagens não lidas no menu.

2. Remoção do chat global da interface
- Em `MainLayout.tsx`, remover:
  - import de `ChatBubble`
  - import e uso de `useChatDB`
  - cálculo de `totalUnread`
  - regra `showChatBubble`
  - renderização do bubble flutuante
- Isso elimina o chat acessível em todas as telas.

3. Remoção dos gatilhos dentro de protocolos
- Em `ProtocoloDetails.tsx`, remover tudo que hoje aciona ou renderiza chat:
  - imports de `ChatBubbleExpanded` e `useChatDB`
  - estados `showChat`, `chatInitialMessage`, `chatTargetUser`
  - função `getValidadorFromLog` se só for usada para chat
  - função `handleDiscutirProtocolo`
  - função `handleAlertarDistribuicao`
  - botões “Discutir Protocolo” e “Alertar Distribuição”
  - bloco final que renderiza `ChatBubbleExpanded`
- Revisar imports de ícones e limpar os que ficarem sem uso (`MessageCircle`, `AlertTriangle`, possivelmente `Send` se só servia ao alerta).

4. Arquivos candidatos à exclusão
Como a funcionalidade deve sair “por completo”, os seguintes arquivos deixam de fazer sentido no frontend:
- `src/pages/Chat.tsx`
- `src/pages/LogsChat.tsx`
- `src/hooks/useChatDB.ts`
- `src/hooks/useUserPresence.ts`
- `src/components/chat/ChatBubble.tsx`
- `src/components/chat/ChatBubbleExpanded.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/NewConversationModal.tsx`
- `src/components/chat/NewGroupModal.tsx`

5. Verificação de dependências restantes
Antes de apagar de vez, eu faria uma busca final para garantir que não restou referência a:
- `/chat`
- `/logs-chat`
- `useChatDB`
- `useUserPresence`
- `ChatBubble`
- `ChatBubbleExpanded`
- `ChatSidebar`
- `ChatWindow`
- `ChatInput`
- `NewConversationModal`
- `NewGroupModal`
- textos “Discutir Protocolo”, “Alertar Distribuição”, “Logs de Chat”

6. Impactos esperados
Após a remoção:
- não haverá mais página de chat
- não haverá mais bubble flutuante
- não haverá mais navegação de protocolo para conversa
- não haverá mais log administrativo de mensagens
- o detalhamento de protocolo fica mais limpo e focado na operação
- some também o tráfego de leitura de conversas/mensagens e presença no frontend

7. Pontos de atenção
- O usuário está atualmente na rota `/chat`; depois da remoção, essa URL passará a cair em `NotFound` ou precisará redirecionar para `/dashboard`. Melhor abordagem: redirecionar qualquer acesso antigo de `/chat` para `/dashboard` por um período, em vez de simplesmente sumir com a rota.
- Se houver tabelas do backend de chat, elas podem permanecer sem uso inicialmente. Como você pediu para “tirar tudo que tenha a ver com Chat”, eu recomendo duas fases:
  1) remover todo o frontend agora
  2) depois revisar backend e banco para limpar tabelas/funções/políticas relacionadas, se você quiser enxugar de vez
- Memórias antigas do projeto indicam que havia também vínculo entre chat e protocolo; por isso a limpeza principal precisa acontecer em `ProtocoloDetails.tsx`, não só nas rotas.

8. Melhorias opcionais junto com a remoção
Para não deixar vazio o espaço que o chat ocupava no fluxo:
- trocar “Discutir Protocolo” por nada, se o objetivo for simplificar ao máximo
- ou substituir no futuro por um campo de observação interna no próprio protocolo
- ou criar um fluxo mais simples de “comentários do protocolo” diretamente no histórico, se depois você quiser manter colaboração sem chat

9. Ordem de implementação recomendada
1. Remover rotas e imports em `App.tsx`
2. Limpar `Sidebar.tsx`
3. Limpar `MainLayout.tsx`
4. Limpar `ProtocoloDetails.tsx`
5. Fazer busca global por referências restantes
6. Excluir arquivos órfãos de chat
7. Validar navegação principal: dashboard, protocolos, motoristas, usuários e portal do motorista

Detalhes técnicos
```text
Hoje o chat está espalhado em 4 pontos principais:

App.tsx
 ├─ rota /chat
 └─ rota /logs-chat

layout
 ├─ MainLayout.tsx -> ChatBubble + useChatDB
 └─ Sidebar.tsx -> item Chat + badge + Logs de Chat

protocolos
 └─ ProtocoloDetails.tsx
    ├─ Discutir Protocolo
    ├─ Alertar Distribuição
    └─ ChatBubbleExpanded

módulos próprios
 ├─ src/components/chat/*
 ├─ src/hooks/useChatDB.ts
 └─ src/hooks/useUserPresence.ts
```

Resultado final esperado
- sistema sem nenhuma interface de chat
- protocolo sem CTA de discussão
- menu lateral sem itens de chat
- layout sem bubble
- código mais simples e com menos dependências realtime

