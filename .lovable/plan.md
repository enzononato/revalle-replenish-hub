## Plano: Protocolos de "Trocas" (criados pelos RN's)

Criar um novo tipo de protocolo **Trocas** que só o RN pode abrir pelo portal, e expor uma nova aba **Trocas** no menu lateral do painel administrativo logo abaixo de **Protocolos**.

---

### 1. Modelo de dados (sem migração)

Reutilizamos a tabela `protocolos`:
- `tipo_reposicao = 'troca'` — marcador do tipo.
- `causa` — uma das opções fixas (lista abaixo).
- `motorista_*` recebe os dados do RN (`motorista_nome` = nome do RN, `motorista_codigo` = `RN-{cpf}` para diferenciar nos relatórios).
- `motorista_unidade` = unidade do RN (mantém compatibilidade com os filtros de unidade existentes).
- `fotos_protocolo = { fotosTroca: [urls] }`.
- `contato_whatsapp`, `contato_email`, `observacao_geral`, `codigo_pdv`, `produtos`.
- `status` inicial `aberto`.
- `observacoes_log` recebe entrada inicial: "RN {nome} abriu protocolo de Trocas".

**Causas (lista fixa no Select):**
1. 01 - Vencido
2. 02 - Embalagem Avariada
3. 03 - Sabor Alterado
4. 04 - Impureza
5. 05 - Mal Cheio
6. 06 - Sem data de Validade
7. 08 - Fora do Prazo Comercial
8. 09 - Produto Impróprio

---

### 2. Portal do RN — formulário de Trocas

**Arquivo novo:** `src/components/rn/TrocaForm.tsx`

Estrutura visual baseada em `PosRota.tsx`. Campos:
1. **Código do PDV** — `PdvAutocomplete` filtrando pela unidade do RN. Obrigatório, com seleção via autocomplete (regra: bloquear digitação manual).
2. **Causa** — `Select` com as 8 opções acima. Obrigatório.
3. **Produtos** — lista dinâmica usando `ProdutoAutocomplete`, quantidade numérica e unidade `UN/CX/PCT`.
4. **Fotos** — `CameraCapture` + galeria, upload via `uploadFotoParaStorage` no bucket `fotos-protocolos`. Obrigatório (≥1 foto).
5. **WhatsApp do contato** — obrigatório, máscara e validação 10–11 dígitos (extrair `formatPhone`/`isValidPhone` para `src/lib/phone.ts` para compartilhar com `RnReenvioModal`).
6. **E-mail** — opcional.
7. **Observação** — `Textarea` opcional.

Submissão:
- Numeração: `TROCA-{yyyyMMddHHmmss}{NN}`.
- `INSERT` em `protocolos` conforme item 1.
- `audit_logs`: `acao='criacao_troca'`, `usuario_role='RN'`, `usuario_unidade=unidade do RN`.
- **Webhook n8n** `https://n8n.revalle.com.br/webhook/reposicaowpp` — **mesma estrutura do webhook de reposição/criação de protocolo** (`tipo: 'criacao_protocolo'`, mesmos campos: `numero`, `data`, `hora`, `codigoPdv`, `motoristaNome` (= nome do RN), `unidade`, `tipoReposicao: 'TROCA'`, `causa`, `produtos`, `whatsappContato`, `observacaoGeral`). Disparo fire-and-forget. Sem notificação adicional (apenas o webhook).
- Tela de sucesso: número do protocolo, botão "Copiar mensagem" e link WhatsApp (padrão PosRota), botão "Nova troca".

**Integração no portal RN** (`src/pages/RnPortal.tsx`):
- Adicionar `Tabs` no topo: **Buscar Protocolos** (conteúdo atual) e **Nova Troca** (`<TrocaForm representante={representante} />`).
- Manter visual mobile-first existente.

---

### 3. Página administrativa de Trocas

**Arquivo novo:** `src/pages/Trocas.tsx`

Layout baseado em `Protocolos.tsx`:
- Lista paginada de protocolos com `tipo_reposicao='troca'` e `ativo=true`.
- Filtros: status (Aberto / Em andamento / Encerrado), unidade, busca por número/PDV/RN, faixa de datas.
- Aplicar filtragem por unidade do usuário (admin vê tudo; demais filtram por `motorista_unidade` na unidade do usuário, suportando multi-unidade separada por vírgula).
- Cada linha mostra: número, data/hora, PDV, RN (`motorista_nome`), causa, qtd. produtos, status.
- Modal de detalhes com: dados gerais, produtos, fotos (galeria com `getDirectStorageUrl` apontando para `fotosTroca`), histórico (`observacoes_log`), contatos.
- Ações para admin / distribuição / controle: marcar **Em andamento**, **Encerrar** (com observação), adicionar nota ao log.
- Soft delete (`ativo=false`) somente para admin.
- Sem fluxo de conferência (diferente de Sobras).

**Roteamento** em `src/App.tsx`:
```text
<Route path="/trocas" element={
  <ProtectedRoute allowedRoles={['admin','distribuicao','controle']}>
    <Trocas />
  </ProtectedRoute>
} />
```

**Sidebar** (`src/components/layout/Sidebar.tsx`):
- Adicionar item **Trocas** (ícone `Repeat` da lucide) imediatamente após **Protocolos**, com `roles: ['admin','distribuicao','controle']`.

---

### 4. Esconder Trocas das listagens existentes

Para evitar mistura com protocolos de reposição:
- `Protocolos.tsx`: filtrar `tipo_reposicao != 'troca'` (manter o filtro existente que exclui `pos_rota`).
- `Sobras.tsx`: já filtra por `tipo_reposicao='pos_rota'`, sem impacto.

---

### 5. Dashboard — métrica separada

- Acrescentar contador / card "Trocas" no `Dashboard.tsx` separado dos protocolos de reposição (consulta `tipo_reposicao='troca'` com os mesmos filtros de data e unidade já aplicados).
- Excluir trocas dos contadores existentes de protocolos para não inflar os números (filtro `tipo_reposicao != 'troca'`).
- Sem alteração no ranking de PDVs/motoristas; trocas ficam isoladas em seu próprio card/seção.

---

### 6. Detalhes técnicos finais

- Sem alterações em RLS: `protocolos` já permite INSERT público (RN não usa Supabase Auth).
- Reuso de utilidades: `compressImage`, `uploadFotoParaStorage`, `PdvAutocomplete`, `ProdutoAutocomplete`, novo `src/lib/phone.ts` (formatPhone/isValidPhone).
- Refatorar `RnReenvioModal.tsx` para importar de `src/lib/phone.ts`.
- Sem novas edge functions, sem novas migrations.
