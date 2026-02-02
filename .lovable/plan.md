

## Plano: Corrigir URLs de Fotos no Webhook WhatsApp

### Problema Identificado

Os protocolos estão salvando e enviando URLs no formato do Supabase:
```
https://miwbbdhfbpmcrfbpulkj.supabase.co/storage/v1/object/public/fotos-protocolos/...
```

Em vez do formato customizado:
```
https://revalle-flow-sync.lovable.app/functions/v1/foto-proxy/...
```

### Causa Raiz

A modificação anterior no `uploadFotoStorage.ts` está correta, porém há dois problemas:

1. **Cache do navegador**: O código pode não ter sido atualizado no dispositivo do motorista
2. **Domínio hardcoded**: O domínio `revalle-flow-sync.lovable.app` está fixo no código, mas deveria detectar automaticamente o domínio em uso (especialmente se houver domínio customizado)

### Solução Proposta

**1. Atualizar `urlHelpers.ts` para detectar domínio dinamicamente**

Modificar a função `getCustomPhotoUrl` para:
- Detectar o domínio atual (`window.location.origin`) quando executado no navegador
- Usar fallback para domínio publicado quando em contexto de servidor
- Suportar domínio customizado automaticamente

```typescript
export function getCustomPhotoUrl(supabaseUrl: string): string {
  if (!supabaseUrl) return supabaseUrl;
  
  // Se já for URL customizada, retornar como está
  if (supabaseUrl.includes('/functions/v1/foto-proxy/')) {
    return supabaseUrl;
  }
  
  const match = supabaseUrl.match(/\/fotos-protocolos\/(.+)$/);
  if (!match || !match[1]) return supabaseUrl;
  
  const imagePath = match[1];
  
  // Detectar domínio dinamicamente
  const baseDomain = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://revalle-flow-sync.lovable.app';
  
  return `${baseDomain}/functions/v1/foto-proxy/${imagePath}`;
}
```

**2. Verificar chamadas de webhook no MotoristaPortal.tsx**

Garantir que as URLs no payload do webhook também usem `getCustomPhotoUrl`:

```typescript
fotos: {
  fotoMotoristaPdv: getCustomPhotoUrl(fotosUrls.fotoMotoristaPdv || ''),
  fotoLoteProduto: getCustomPhotoUrl(fotosUrls.fotoLoteProduto || ''),
  fotoAvaria: getCustomPhotoUrl(fotosUrls.fotoAvaria || '')
},
```

**3. Adicionar validação no webhook de e-mail (MotoristaPortal.tsx)**

Aplicar a mesma conversão para as fotos enviadas no payload de e-mail.

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/utils/urlHelpers.ts` | Adicionar detecção dinâmica de domínio + verificação de URL já convertida |
| `src/pages/MotoristaPortal.tsx` | Importar `getCustomPhotoUrl` e aplicar nas fotos do webhook |

---

### Seção Tecnica

A modificação principal é no `urlHelpers.ts`:

1. **Verificar se já é URL customizada**: Evitar dupla conversão
2. **Usar `window.location.origin`**: Detecta automaticamente o domínio atual (incluindo domínios custom)
3. **Fallback para SSR**: Caso `window` não exista, usar domínio padrão

No `MotoristaPortal.tsx`, aplicar conversão explicita:
- Linha ~608-612: Adicionar `getCustomPhotoUrl()` wrapper
- Importar função do `urlHelpers.ts`

Isso garante que mesmo se o `uploadFotoStorage` retornar URL do Supabase (por qualquer motivo), o webhook sempre enviará URL customizada.

