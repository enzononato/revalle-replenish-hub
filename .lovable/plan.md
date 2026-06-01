## Bugs encontrados no fluxo end-to-end de Troca

### 1. Fotos da troca não vão no webhook n8n (criação) — **bug funcional**
`TrocaForm.tsx` linha 264-279: o `webhookPayload` enviado ao n8n na criação **não inclui o array de fotos**. As fotos são salvas em `fotos_protocolo.fotosTroca` no banco (confirmado em produção: 100% das trocas têm fotos no DB), mas o n8n não as recebe — então a mensagem WhatsApp de lançamento da troca sai sem imagens.

Comparação: o webhook de reposição envia bloco `fotos: { fotoMotoristaPdv, fotoLoteProduto, fotoAvaria }`. Para troca precisamos enviar `fotos: { fotosTroca: [urls] }` (ou `fotosTroca: [urls]` no topo do payload, alinhado com o que n8n espera).

### 2. Fotos da troca também ausentes no webhook de encerramento — **bug funcional**
`ProtocoloDetails.tsx`:
- `handleEncerrarProtocolo` linhas 527-531
- `handleReenviarWhatsapp` (modo `encerrar`) linhas 663-667
- `handleReenviarWhatsapp` (modo `lancar`) linhas 626-630

Todos enviam apenas `fotoMotoristaPdv/fotoLoteProduto/fotoAvaria` (vazios em trocas). Quando uma troca é encerrada ou tem WhatsApp reenviado, **as fotos da troca são perdidas** no payload n8n.

Mesma falha em `RnReenvioModal.tsx` linhas 73-110 e em `CmePortal.tsx` (que reaproveita `RnReenvioModal`).

### 3. Casing inconsistente de `tipoReposicao` — **risco de bug no n8n**
- `TrocaForm` criação → `tipoReposicao: 'TROCA'` (uppercase)
- `ProtocoloDetails.handleEncerrarProtocolo` (linha 515) → `protocolo.tipoReposicao` = `'troca'` (lowercase)
- `ProtocoloDetails.handleReenviarWhatsapp` lançar (linha 623) → `'TROCA'` (uppercase)
- `ProtocoloDetails.handleReenviarWhatsapp` encerrar (linha 651) → `'troca'` (lowercase)
- `RnReenvioModal` lançar (84) → uppercase / encerrar (102) → lowercase

Se o n8n decide o template/roteamento por esse campo, encerramentos podem cair em fluxo errado.

### 4. Campo `emailContato` ausente no webhook de criação de troca — **bug menor**
`TrocaForm` coleta `emailContato` mas o payload n8n (linha 264-279) não inclui `emailContato` nem `motoristaEmail`. O webhook de reposição inclui. Se o n8n dispara e-mail, trocas nunca recebem.

### 5. `RnReenvioModal` não preserva `motoristaCodigo` nem `unidade real` no payload de encerramento — **bug menor**
Linhas 91-110: usa `representante.unidade` (do RN logado) em vez de `motorista_unidade` do protocolo, podendo enviar unidade errada caso um RN reenvie protocolo aberto por outro RN da mesma rede.

### 6. Conferente/Lançamento na página `/trocas` — **bug de UX**
`Protocolos.tsx` é compartilhado entre `/protocolos` e `/trocas`. Em scope='troca':
- O botão "Criar Protocolo" é ocultado corretamente (linha 530).
- Porém as colunas/toggles de **Lançado** e **Validado** continuam visíveis na tabela e o `handleEncerrarProtocolo` exige `validacao=true` antes de lançar. Trocas não passam por Conferência/Distribuição, então esses controles são confusos e bloqueiam encerramento normal.

Verificar com o usuário se devemos esconder/desabilitar esses controles em scope='troca' (corrigir junto da renderização da tabela e do `handleToggleLancado`).

### 7. `motorista_codigo` sem CPF cai em `'RN-'` — **edge case**
`TrocaForm` linha 209/222: `RN-${cpfRn}` — se o RN não tem CPF cadastrado, fica `RN-` (string vazia). Como `representantes.cpf` é `NOT NULL`, na prática não ocorre, mas vale validar antes do insert para evitar registros corrompidos no futuro.

---

## Plano de correção (em build)

**Fix obrigatórios (1, 2, 3, 4):**

1. **`src/components/rn/TrocaForm.tsx`** (`handleSubmit`):
   - Acrescentar ao `webhookPayload`:
     ```
     fotos: { fotosTroca: fotosUrls },
     emailContato: emailContato || '',
     motoristaEmail: emailContato || '',
     ```

2. **`src/components/ProtocoloDetails.tsx`** — criar helper único `buildFotosWebhookPayload(protocolo)` que retorna:
   ```
   {
     fotoMotoristaPdv, fotoLoteProduto, fotoAvaria,
     fotosTroca: protocolo.fotosProtocolo?.fotosTroca ?? []
   }
   ```
   Usar nos 3 locais (linhas 527, 626, 663).

3. **`src/components/rn/RnReenvioModal.tsx`** — incluir `fotos: { ...fotosTroca... }` no payload e padronizar `tipoReposicao` em UPPERCASE em ambos `lancar` e `encerrar`.

4. **Padronizar casing**: alinhar todos os webhooks para `tipoReposicao: (protocolo.tipoReposicao || '').toUpperCase()` nos 5 pontos listados.

5. **`RnReenvioModal`** — usar `motorista_unidade` (campo já consultado no select) em vez de `representante.unidade`. Pequeno ajuste no `select(...)` e nos payloads.

**Decisão pendente (item 6 — UX da página /trocas):**
Se devo ou não esconder os toggles de "Lançado"/"Validado" e simplificar o encerramento de trocas (sem exigir validação prévia). Vou perguntar antes de implementar.

**Não-bug (validado em produção):**
- Geração de número `TROCA-YYYYMMDDHHMMSSrr` funcionando.
- Storage de fotos em `fotos-protocolos` salvando URLs com domínio customizado `reposicao.revalle.com.br/functions/v1/foto-proxy/...`.
- RPC `get_dashboard_resumo` conta `trocas_total` corretamente (filtra `oculto=false`).
- "Minhas Trocas" no `RnPortal` lista por `motorista_id` + `ativo=true` — OK.
- Visualização de fotos no `ProtocoloDetails` já corrigida na mensagem anterior.