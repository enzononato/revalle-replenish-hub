
## Adicionar botão "Enviar no WhatsApp do Cliente" na tela de sucesso

### O que será feito

Na tela de sucesso exibida após a criação do protocolo (componente `MotoristaPortal.tsx`, linhas 853–898), será adicionado um botão verde de WhatsApp que abre o WhatsApp do número do cliente (campo `whatsappContato`) com a mensagem já preenchida no padrão definido pelo usuário.

---

### Problema técnico

As URLs das fotos (`fotosUrls`) são variáveis locais dentro do `handleSubmit` e se perdem após o submit. Para que a tela de sucesso consiga montar a mensagem com os links das fotos, é preciso guardar essas URLs no estado do componente.

---

### Mudanças no `src/pages/MotoristaPortal.tsx`

**1. Novo estado para guardar as URLs das fotos após o upload**

```typescript
const [fotosProtocoloCriado, setFotosProtocoloCriado] = useState<{
  fotoMotoristaPdv: string;
  fotoLoteProduto: string;
  fotoAvaria?: string;
} | null>(null);
```

**2. Salvar as URLs após o upload bem-sucedido (dentro de `handleSubmit`)**

Após `setProtocoloCriado(true)`, também chamar:
```typescript
setFotosProtocoloCriado({
  fotoMotoristaPdv: fotosUrls.fotoMotoristaPdv || '',
  fotoLoteProduto: fotosUrls.fotoLoteProduto || '',
  fotoAvaria: fotosUrls.fotoAvaria || undefined
});
```

**3. Limpar o estado ao resetar o formulário (`resetForm`)**

```typescript
setFotosProtocoloCriado(null);
```

**4. Função que monta o link do WhatsApp**

Usando os dados já disponíveis no estado, montar a mensagem exatamente no formato pedido, depois encodar com `encodeURIComponent`:

```typescript
const buildWhatsAppLink = () => {
  const numeroLimpo = whatsappContato.replace(/\D/g, '');
  // Se tiver 10 ou 11 dígitos, assumir Brasil (55)
  const telefone = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;

  const mensagem = `🆕 *NOVO PROTOCOLO ABERTO*\n\n🆔 *Protocolo:* ${numeroProtocolo}\n\n🏷️ *Tipo:* ${tipoReposicao.toUpperCase()}\n\n⚠️ *Causa:* ${causa}\n\n📆 *Data:* ${data} às ${hora}\n\n📋 *MAPA:* ${mapa}\n\n📌 *Cód. PDV:* ${codigoPdv}\n\n📦 *NF:* ${notaFiscal}\n\n👤 *Motorista:* ${motorista.nome}\n\n🏭 *Unidade:* ${motorista.unidade || ''}\n\n📞 ${whatsappContato}${emailContato ? '\n📧 ' + emailContato : ''}\n\n📦 *ITENS SOLICITADOS:*\n\n${produtosFormatados.map(p => '▪️ *' + p.nome + '*\n   Cód: ' + p.codigo + ' | Qtd: ' + p.quantidade + ' ' + p.unidade + (p.validade ? '\n   📅 Validade: ' + p.validade : '')).join('\n\n')}\n\n📝 *Obs:* ${observacao || 'Nenhuma'}\n\n📸 *Foto Motorista:*\n\n${fotosProtocoloCriado?.fotoMotoristaPdv || ''}\n\n📦 *Foto Lote:*\n\n${fotosProtocoloCriado?.fotoLoteProduto || ''}${fotosProtocoloCriado?.fotoAvaria ? '\n\n🛠️ *Foto Avaria:*\n' + fotosProtocoloCriado.fotoAvaria : ''}\n\n_- Reposição Revalle_`;

  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
};
```

Para montar a mensagem, os campos `data`, `hora` e `produtosFormatados` precisam estar disponíveis. Estes valores são calculados dentro do `handleSubmit`. Além das fotos, também salvarei: `dataProtocolo`, `horaProtocolo` e `produtosProtocolo` em estado para uso na tela de sucesso.

**5. Botão na tela de sucesso**

Um novo botão verde com ícone do WhatsApp, posicionado acima do botão "Abrir Novo Protocolo", visível apenas quando o protocolo foi criado online (tem fotos com URLs reais):

```tsx
<a
  href={buildWhatsAppLink()}
  target="_blank"
  rel="noopener noreferrer"
  className="w-full"
>
  <Button className="w-full h-12 text-base bg-green-500 hover:bg-green-600 text-white">
    <MessageCircle className="mr-2 h-5 w-5" />
    Enviar no WhatsApp do Cliente
  </Button>
</a>
```

---

### Arquivos a modificar

| Arquivo | O que muda |
|---|---|
| `src/pages/MotoristaPortal.tsx` | Novo estado para dados do protocolo criado; função `buildWhatsAppLink`; botão na tela de sucesso |

---

### Comportamento esperado

1. Motorista preenche o formulário e submete
2. Protocolo é criado, fotos são enviadas
3. Tela de sucesso aparece com:
   - Checkmark verde e número do protocolo
   - ✅ **Botão verde "Enviar no WhatsApp do Cliente"** — abre o WhatsApp com a mensagem já montada, pronta para enviar
   - Botão "Abrir Novo Protocolo"
   - Botão "Meus Protocolos"
   - Botão "Sair"
4. O link usará o número informado no campo "WhatsApp do Contato" do formulário, com DDI 55 adicionado automaticamente se necessário
