## Diagnóstico

Ontem (02/06) o motorista Uellinton Galvão gerou **9 protocolos idênticos** do mesmo PDV `25761` / NF `889112` / causa `FALTA DE PALLET MONTADO` em ~10 segundos (19:30:26 → 19:30:36), todos com números RPF distintos. Mesmo padrão se repetiu em outra leva de 1–2 duplicatas.

Olhando `src/pages/MotoristaPortal.tsx` (`handleSubmit`, linha 485), o botão "Enviar" tem `disabled={isCompressing || isUploading}`, mas `setIsUploading(true)` só é chamado **muito depois**, após:
1. ~15 validações síncronas
2. `await gerarNumeroProtocolo(...)` (RPC de rede)
3. Início do upload das fotos

Em conexão móvel lenta o botão fica "preso" por alguns segundos sem feedback. O motorista toca de novo. Como nada bloqueia chamadas concorrentes de `handleSubmit`, cada toque dispara um pipeline próprio, gera um número novo via RPC e insere uma linha. O mesmo problema existe em `src/pages/AbrirProtocolo.tsx` (`isUploading` só vira `true` na linha 236, depois do `gerarNumeroProtocolo`) e em `src/components/rn/TrocaForm.tsx` (`setIsSubmitting` no início está OK, mas sem trava por ref → re-render pode permitir corrida em casos extremos).

Não há nenhum índice/constraint de deduplicação no banco nem checagem "já existe protocolo igual recente?" antes do insert.

## Correção

### 1. `src/pages/MotoristaPortal.tsx` — trava imediata
- Criar `submittingRef = useRef(false)`.
- No topo de `handleSubmit`, antes de qualquer validação/await:
  ```ts
  if (submittingRef.current || isUploading) return;
  submittingRef.current = true;
  setIsUploading(true);
  ```
- Liberar (`submittingRef.current = false; setIsUploading(false)`) em **todos** os retornos (validação falhou, erro de RPC, erro de upload, sucesso) via `try/finally`.
- Hoje `setIsUploading(true)` só ocorre depois do `gerarNumeroProtocolo`; mover para o início resolve a janela de corrida.

### 2. `src/pages/AbrirProtocolo.tsx` — mesma trava
- Aplicar o mesmo padrão `submittingRef` + `setIsUploading(true)` no topo do `handleSubmit` (linha 180), envolvendo tudo em `try/finally`.

### 3. `src/components/rn/TrocaForm.tsx` — reforçar
- Adicionar `submittingRef` igual, ainda que o `setIsSubmitting(true)` atual já ajude. Mantém o padrão consistente.

### 4. Dedupe defensivo no servidor (rede do motorista pode reenviar)
- Antes do `supabase.from('protocolos').insert(...)` em MotoristaPortal/AbrirProtocolo, fazer um `select` rápido:
  ```ts
  const { data: dup } = await supabase
    .from('protocolos')
    .select('numero, created_at')
    .eq('motorista_id', motoristaId)
    .eq('codigo_pdv', codigoPdv.trim())
    .eq('nota_fiscal', notaFiscal.trim())
    .eq('tipo_reposicao', tipoReposicao)
    .eq('causa', causa)
    .gte('created_at', new Date(Date.now() - 60_000).toISOString())
    .limit(1)
    .maybeSingle();
  if (dup) { toast('Protocolo já registrado há instantes'); return; }
  ```
  Janela de 60s evita 99% dos toques múltiplos sem bloquear reenvio legítimo posterior.

### 5. Marcar os 8 duplicados de ontem como ocultos
- Manter o `RPF-2026060219304397` (primeiro, 19:30:26) e setar `oculto=true` nos outros 8 da mesma janela. Faço via migration de UPDATE quando aprovado, com lista explícita de `numero`.

## Resumo do que causou

Botão de envio sem trava imediata + RPC de número de protocolo demorada em rede instável → motorista tocou várias vezes → cada toque rodou um `handleSubmit` em paralelo → 9 inserts com números diferentes mas mesmos dados.
