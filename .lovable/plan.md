
## Plano: Adicionar Cópia de E-mail (CC) para Logística

### Análise da Situação Atual

O sistema Lovable **já implementa 100%** da funcionalidade do seu código PHP:

| Funcionalidade | Status |
|---|---|
| Upload de fotos | Funcionando (Supabase Storage) |
| Salvar no banco | Funcionando (Supabase/PostgreSQL) |
| Enviar WhatsApp | Funcionando via n8n webhook |
| Enviar E-mail SMTP | Funcionando via Edge Function |

**Única diferença identificada**: O PHP envia cópia (CC) do e-mail para `logistica@revalle.com.br`, mas o Lovable atual envia apenas para o e-mail do contato.

---

### Modificação Necessária

**Arquivo: `supabase/functions/enviar-email/index.ts`**

Adicionar suporte a destinatários CC no envio SMTP:

1. **Adicionar constante** para o e-mail de cópia:
```typescript
const COPY_EMAIL = "logistica@revalle.com.br";
```

2. **Modificar a função `enviarEmailSMTP`** para aceitar CC:
```typescript
async function enviarEmailSMTP(
  to: string,
  subject: string,
  htmlBody: string,
  cc?: string  // Novo parâmetro opcional
): Promise<void> {
  // ... código existente ...
  
  // RCPT TO principal
  await write(`RCPT TO:<${to}>\r\n`);
  await read();
  
  // RCPT TO para CC (se fornecido)
  if (cc) {
    await write(`RCPT TO:<${cc}>\r\n`);
    await read();
  }
  
  // ... resto do código ...
  
  // Atualizar headers do email
  const emailContent = [
    `From: "Revalle Protocolos" <${SMTP_USER}>`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : '', // Adicionar header CC
    // ...
  ].filter(Boolean).join("\r\n");
}
```

3. **Chamar a função com CC**:
```typescript
await enviarEmailSMTP(
  data.clienteEmail, 
  assunto, 
  htmlContent, 
  COPY_EMAIL  // Sempre enviar cópia para logística
);
```

---

### Resultado Esperado

Após a modificação, todos os e-mails de protocolo (abertura, encerramento, reabertura) serão enviados:
- **Para**: E-mail do contato informado no protocolo
- **CC**: logistica@revalle.com.br

---

### Seção Técnica

A modificação será feita na Edge Function `enviar-email` (linhas ~420-510) adicionando:
1. Constante para o e-mail CC
2. Comando SMTP adicional `RCPT TO` para o CC
3. Header `Cc:` no corpo do e-mail MIME
4. Filtro para remover linhas vazias quando CC não existir
