
## Add WhatsApp Closure Message Button to Closed Protocols

### What's changing

In `src/components/motorista/MeusProtocolos.tsx`, I'll add the same WhatsApp + Copy buttons pattern used for open/in-progress protocols — but now for **closed** (`encerrado`) protocols, using a closure message template.

### The closure message template (no emojis)

```
*PROTOCOLO ENCERRADO*

*Protocolo:* {numero}
*Status:* Encerrado com sucesso
*Data:* {data} as {hora}
*Tipo:* {tipo_reposicao}
*Causa:* {causa}
*MAPA:* {mapa}
*Cod. PDV:* {codigo_pdv}
*Assinatura do canhoto:* {foto_nota_fiscal_encerramento}
*Motorista:* {motorista_nome}
*Unidade:* {motorista_unidade}
{contato_whatsapp}
{contato_email}

*ITENS CONFERIDOS:*

- *{nome}*
   Cod: {codigo} | Qtd: {quantidade} {unidade}
   Validade: {validade}

*Mensagem Final:* {mensagem_encerramento}

_- Reposicao Revalle_
```

### Technical changes

**File: `src/components/motorista/MeusProtocolos.tsx`**

1. **Expand the `ProtocoloSimples` interface** to include two fields that are already in the database but not yet selected:
   - `mensagem_encerramento: string | null`
   - `foto_nota_fiscal_encerramento: string | null`

2. **Update the Supabase query** in `fetchProtocolos` to also select `mensagem_encerramento` and `foto_nota_fiscal_encerramento`.

3. **Add a new function** `buildMensagemEncerramento(protocolo, motoristaInfo)` that formats the closure message using the template above (plain text, no emojis, WhatsApp bold `*field*`).

4. **Add a new function** `buildWhatsAppLinkEncerramento(protocolo, motoristaInfo)` that uses `getTelefoneCliente` (which already checks both `cliente_telefone` and `contato_whatsapp`) to build the `wa.me` URL.

5. **Add a second `copiadoIdEncerramento` state** (or reuse `copiadoId` with a suffix) to independently track clipboard feedback for closure cards without interfering with the open-protocol copy button.

6. **Add the buttons block** inside `renderContent`, below the products list, gated by `protocolo.status === 'encerrado'` — mirroring the existing block for `aberto`/`em_andamento` (lines 427–481):
   - Green WhatsApp button (enabled if phone exists, disabled if not)
   - "Copiar mensagem" button with Check/Copy icon feedback
