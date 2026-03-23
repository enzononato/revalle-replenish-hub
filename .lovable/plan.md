

## Plan: Add webhook to Pós-Rota creation

### What
After the pós-rota protocol is inserted into the database (and after the audit log), send a POST to `https://n8n.revalle.com.br/webhook/reposicaowpp` with `tipo: 'pos_rota'`, mirroring the same payload structure used for regular protocol creation.

### Changes

**File: `src/components/motorista/PosRota.tsx`** (single edit, ~lines 259-287)

After the audit log insert and before `setEnviado(true)`, add a webhook call:

```typescript
// Send webhook to n8n (same endpoint as protocol creation)
const webhookPayload = {
  tipo: 'pos_rota',
  numero,
  data: format(agora, 'dd/MM/yyyy'),
  hora: format(agora, 'HH:mm:ss'),
  mapa: mapa.trim(),
  codigoPdv: precisaPdv ? codigoPdv.trim() : '',
  notaFiscal: notaFiscal.trim() || '',
  motoristaNome: motorista.nome,
  motoristaCodigo: motorista.codigo,
  motoristaWhatsapp: motorista.whatsapp || '',
  motoristaEmail: motorista.email || '',
  unidade: motorista.unidade || '',
  tipoReposicao: 'POS_ROTA',
  causa: `SOBRA EM ROTA - ${tipoLabel.toUpperCase()}`,
  produtos: [],
  fotos: { fotosSobra: fotosUrls },
  observacaoGeral: observacao.trim() || '',
};

fetch('https://n8n.revalle.com.br/webhook/reposicaowpp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(webhookPayload),
}).then(res => {
  if (res.ok) console.log('Webhook pós-rota enviado com sucesso');
  else console.error('Erro webhook pós-rota:', res.status);
}).catch(err => console.error('Erro webhook pós-rota:', err));
```

The webhook is fire-and-forget (non-blocking), same pattern as the existing protocol creation webhook. No database or edge function changes needed.

