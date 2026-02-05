
# Plano: Correção do Carregamento de Fotos nos Detalhes do Protocolo

## Diagnóstico

### Problema Identificado
As fotos de abertura e encerramento não estão aparecendo nos detalhes do protocolo porque as URLs salvas no banco de dados usam o domínio customizado (`reposicao.revalle.com.br`), que não é acessível quando o usuário está visualizando pelo ambiente de preview do Lovable.

### Dados do Banco
```json
{
  "fotoMotoristaPdv": "https://reposicao.revalle.com.br/functions/v1/foto-proxy/PROTOC-.../foto.jpeg",
  "fotoLoteProduto": "https://reposicao.revalle.com.br/functions/v1/foto-proxy/PROTOC-.../foto.jpeg"
}
```

### Fluxo Atual (problemático)
```text
Upload → getCustomPhotoUrl() → Salva URL com domínio customizado no banco
                                         ↓
Exibição → <img src="URL customizada"> → Falha se não estiver no domínio correto
```

---

## Solução Proposta

### Abordagem
Criar uma função que converte URLs de `foto-proxy` de qualquer domínio para a URL direta do Supabase Storage, garantindo que as imagens sempre carreguem corretamente independente do ambiente.

### Arquivos a Modificar

#### 1. `src/utils/urlHelpers.ts`
Adicionar nova função `getDirectStorageUrl()`:
- Extrai o path da imagem de qualquer URL (foto-proxy ou storage direto)
- Retorna URL direta do Supabase Storage usando a variável de ambiente `VITE_SUPABASE_URL`
- Mantém `getCustomPhotoUrl()` para links externos (WhatsApp, Email)

```text
Novas funções:
- getDirectStorageUrl(url): Converte para URL direta do Storage
- getImagePath(url): Extrai apenas o path da imagem
```

#### 2. `src/components/ProtocoloDetails.tsx`
Usar `getDirectStorageUrl()` para todas as fotos exibidas em tags `<img>`:
- Fotos de abertura (Motorista/PDV, Lote Produto, Avaria)
- Fotos de encerramento (Canhoto Assinado, Entrega Mercadoria, Anexo)

---

## Detalhes Técnicos

### Nova função `getDirectStorageUrl()`
```typescript
export function getDirectStorageUrl(photoUrl: string): string {
  if (!photoUrl) return photoUrl;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return photoUrl;

  // Extrair o path da foto de qualquer formato
  let imagePath: string | null = null;

  // Caso 1: URL de foto-proxy (qualquer domínio)
  const proxyMatch = photoUrl.match(/\/functions\/v1\/foto-proxy\/(.+)$/);
  if (proxyMatch?.[1]) {
    imagePath = proxyMatch[1];
  }

  // Caso 2: URL do storage do Supabase
  const storageMatch = photoUrl.match(/\/fotos-protocolos\/(.+)$/);
  if (storageMatch?.[1]) {
    imagePath = storageMatch[1];
  }

  if (!imagePath) return photoUrl;

  // Retorna URL direta do Storage
  return `${supabaseUrl}/storage/v1/object/public/fotos-protocolos/${imagePath}`;
}
```

### Uso no ProtocoloDetails.tsx
```typescript
// Fotos de abertura
if (protocolo.fotosProtocolo?.fotoMotoristaPdv) {
  todasFotos.push({ 
    url: getDirectStorageUrl(protocolo.fotosProtocolo.fotoMotoristaPdv), 
    label: 'Motorista/PDV' 
  });
}

// Fotos de encerramento
if (protocolo.fotoNotaFiscalEncerramento) {
  fotosEncerramento.push({ 
    url: getDirectStorageUrl(protocolo.fotoNotaFiscalEncerramento), 
    label: 'Canhoto Assinado' 
  });
}
```

---

## Fluxo Corrigido

```text
Upload → getCustomPhotoUrl() → Salva URL com domínio customizado (para WhatsApp/Email)
                                         ↓
Exibição → getDirectStorageUrl() → Converte para URL direta do Storage → <img> carrega OK
                                         ↓
Links externos → Mantém URL customizada para compartilhamento
```

---

## Benefícios

1. **Compatibilidade**: Fotos funcionam em qualquer ambiente (preview, produção, domínio customizado)
2. **Sem migração**: Não precisa alterar dados existentes no banco
3. **Manutenção separada**: URLs diretas para exibição, URLs customizadas para compartilhamento externo
4. **Performance**: URLs diretas do Storage são mais rápidas que passar pelo proxy

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/utils/urlHelpers.ts` | Adicionar função `getDirectStorageUrl()` |
| `src/components/ProtocoloDetails.tsx` | Usar `getDirectStorageUrl()` nas fotos de abertura e encerramento |
