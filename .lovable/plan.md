
## Plano: URLs de Fotos com Domínio Personalizado

### Situação Atual

As fotos são armazenadas no Supabase Storage e geram URLs como:
```
https://miwbbdhfbpmcrfbpulkj.supabase.co/storage/v1/object/public/fotos-protocolos/REP-123/motorista_pdv_1234567890.jpg
```

### Solução: Criar Edge Function de Proxy

Criar uma Edge Function que funciona como **proxy** para as imagens, permitindo URLs mais amigáveis como:
```
https://revalle-flow-sync.lovable.app/functions/v1/foto/REP-123/motorista_pdv_1234567890.jpg
```

Ou, se você configurar seu domínio custom:
```
https://seudominio.com.br/functions/v1/foto/REP-123/motorista_pdv_1234567890.jpg
```

---

### Implementação

**1. Criar Edge Function `foto-proxy`**

```typescript
// supabase/functions/foto-proxy/index.ts
serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace('/foto-proxy/', '');
  
  // Buscar imagem do Storage
  const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/fotos-protocolos/${path}`;
  
  const response = await fetch(storageUrl);
  return new Response(response.body, {
    headers: {
      'Content-Type': response.headers.get('Content-Type'),
      'Cache-Control': 'public, max-age=31536000'
    }
  });
});
```

**2. Criar função utilitária para converter URLs**

```typescript
// src/utils/urlHelpers.ts
export function getCustomPhotoUrl(supabaseUrl: string): string {
  // Extrair o path da foto
  const match = supabaseUrl.match(/\/fotos-protocolos\/(.+)$/);
  if (!match) return supabaseUrl;
  
  const baseDomain = window.location.origin;
  return `${baseDomain}/functions/v1/foto-proxy/${match[1]}`;
}
```

**3. Aplicar nos locais de geração de URL**

Atualizar `uploadFotoStorage.ts` para retornar URLs customizadas.

---

### Alternativa Mais Simples (Sem Edge Function)

Se o objetivo é apenas **exibir URLs mais amigáveis** nas mensagens de WhatsApp/e-mail, podemos criar um **encurtador de URL**:

1. Criar tabela `url_shortcuts` com ID curto → URL completa
2. Edge Function que redireciona: `/r/abc123` → URL do Supabase

Isso geraria URLs como:
```
https://revalle-flow-sync.lovable.app/functions/v1/r/abc123
```

---

### Recomendação

A **opção do proxy** é mais robusta pois:
- Mantém o caminho original legível
- Não precisa de banco de dados extra
- Cache eficiente
- Funciona automaticamente com seu domínio custom

---

### Seção Técnica

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/foto-proxy/index.ts` | Nova Edge Function que faz proxy das imagens |
| `src/utils/uploadFotoStorage.ts` | Converter URL do Supabase para URL customizada |
| `src/utils/urlHelpers.ts` | Novo arquivo com função de conversão de URLs |

A Edge Function recebe o path da imagem, busca no Storage e retorna a imagem com headers de cache otimizados.
