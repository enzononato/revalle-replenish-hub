# Plano: Sobras automáticas para Inversão e Avaria

## Contexto descoberto
"Sobras" hoje **não é uma tabela** — é a página `src/pages/Sobras.tsx` que lista registros de `protocolos` com `tipo_reposicao = 'pos_rota'`. Ou seja, cada "sobra" é um protocolo do tipo `pos_rota`, criado hoje pelo motorista no fluxo de Pós-Rota.

Vamos manter esse mesmo modelo: cada protocolo de **Inversão** ou **Avaria** vai gerar automaticamente um **protocolo-irmão do tipo `pos_rota`** (a "sobra"), vinculado ao original. Isso reaproveita 100% da página de Sobras já existente.

---

## Mudanças

### 1. Banco de dados (migração)
Adicionar campos na tabela `protocolos`:
- `protocolo_origem_id uuid` — referência ao protocolo original (inversão/avaria) que gerou esta sobra. Null para sobras criadas pelo Pós-Rota normal.
- `confirmacao_conferente jsonb default '{}'` — armazena por produto: `{ codigo: { status: 'voltou' | 'nao_voltou' | 'parcial', quantidade_retornada: number, foto?: string, conferente_nome, conferente_id, data, hora } }`.
- `conferencia_status text default 'pendente'` — `pendente` → `confirmado_conferente` → `finalizado`.
- `finalizado_por_nome text`, `finalizado_por_id text`, `finalizado_em timestamptz`, `destino_final text` (estoque/descarte/outro), `observacao_finalizacao text`.

Índice em `protocolo_origem_id`.

### 2. Criação automática da sobra
Quando um protocolo é criado com `tipo_reposicao IN ('inversao', 'avaria')`:
- Disparar a criação de um **segundo protocolo** com:
  - `tipo_reposicao = 'pos_rota'`
  - `protocolo_origem_id = <id do original>`
  - mesmo motorista, unidade, codigo_pdv, produtos (clonados, mas com quantidades zeradas em `confirmacao_conferente`)
  - `numero` derivado (ex.: `<numero_original>-S`)
  - `status = 'aberto'`, `conferencia_status = 'pendente'`
  - observação automática: "Sobra gerada automaticamente a partir do protocolo X (inversão/avaria)"

**Onde implementar:** no fluxo de criação de protocolo no front (`useAddProtocolo` / `CreateProtocoloModal` / `AbrirProtocolo` / `MotoristaPortal`). Centralizar numa função utilitária `criarSobraDeProtocolo(protocoloOriginal)` chamada após o insert do original retornar com sucesso.

**Aplica-se apenas a novos protocolos.** Os existentes ficam como estão.

### 3. Página Sobras — confirmação por produto
No modal de detalhe de sobra (`ProtocoloDetails` / detalheSobra em `Sobras.tsx`):
- Quando `protocolo_origem_id` estiver presente E `conferencia_status = 'pendente'`, mostrar bloco **"Confirmação do Conferente"**:
  - Lista de produtos do protocolo origem
  - Para cada produto: 3 botões/radio (`Voltou tudo` / `Voltou parcial` / `Não voltou`) + campo de quantidade retornada (quando parcial) + upload opcional de foto (botão "Anexar foto", usa `CameraCapture` ou input file, sobe para bucket `fotos-protocolos`)
  - Botão **"Confirmar conferência"** salva tudo no `confirmacao_conferente` e muda `conferencia_status` para `confirmado_conferente`. Registra log em `observacoes_log`.

- Roles permitidos para confirmar: `conferente`, `admin`, `distribuicao`.

### 4. Finalização (admin/distribuição)
Quando `conferencia_status = 'confirmado_conferente'`, mostrar bloco **"Finalizar tratativa"**:
- Resumo do que o conferente confirmou (read-only)
- Select de **destino final**: `Devolver ao estoque` / `Descarte` / `Reentregar` / `Outro`
- Campo de observação obrigatório
- Botão **"Finalizar"** → preenche `finalizado_*`, muda `conferencia_status` para `finalizado` e `status` do protocolo-sobra para `encerrado`. Log na timeline.

Permitido apenas para `admin` e `distribuicao`.

### 5. Indicadores visuais na página Sobras
- Badge no card da sobra mostrando `conferencia_status` (Pendente conferente / Aguardando finalização / Finalizado).
- Filtro/aba adicional na barra de status para esses 3 estados.
- Quando a sobra tem `protocolo_origem_id`, mostrar link/badge "Origem: protocolo Nº X (Inversão|Avaria)" que abre o protocolo original em outra aba/modal.

### 6. Rastreabilidade no protocolo original
No `ProtocoloDetails` do protocolo de inversão/avaria, mostrar bloco "Sobra vinculada" com link para a sobra gerada e seu status atual de conferência.

---

## Diagrama do fluxo

```text
[Motorista cria protocolo Inversão/Avaria]
            |
            v
[INSERT protocolos (original)]
            |
            v
[Auto: INSERT protocolos (sobra, tipo=pos_rota, origem=original.id)]
            |
            v
[Página Sobras lista a sobra como "Pendente conferente"]
            |
            v
[Conferente abre, marca cada produto: voltou/parcial/não voltou (+foto)]
            |
            v
[conferencia_status = confirmado_conferente]
            |
            v
[Admin/Distribuição abre, escolhe destino final + observação]
            |
            v
[conferencia_status = finalizado, status = encerrado]
```

---

## Arquivos previstos

- `supabase/migrations/<novo>.sql` — colunas novas + índice
- `src/utils/criarSobraDeProtocolo.ts` (novo) — helper centralizado
- `src/hooks/useAddProtocolo.ts` — chamar o helper após criar inversão/avaria
- `src/components/CreateProtocoloModal.tsx` e `src/pages/AbrirProtocolo.tsx` e `src/pages/MotoristaPortal.tsx` — garantir que usam o helper (ou que `useAddProtocolo` cobre todos)
- `src/pages/Sobras.tsx` — novos blocos de confirmação/finalização, badges e filtros
- `src/components/ProtocoloDetails.tsx` — mostrar link "Sobra vinculada" no protocolo original
- `src/types/index.ts` — campos novos no tipo `Protocolo`
- `src/integrations/supabase/types.ts` — auto-regenerado pela migração

---

## Pontos que NÃO entram neste plano (deixar explícito)
- Não migra protocolos antigos.
- Não envia webhook/n8n específico para a criação automática da sobra (ela segue o mesmo fluxo das outras sobras).
- Não altera o fluxo do Pós-Rota normal (motorista continua criando sobras manualmente também).
- Não muda o comportamento de protocolos do tipo `falta` (não geram sobra).
