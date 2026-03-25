

## Problema encontrado

Ao mover o `ProtocolosProvider` para o nível de rota (apenas em `/dashboard` e `/protocolos`), duas outras páginas que também usam `useProtocolos()` ficaram sem o provider, causando crash:

1. **`/abrir-protocolo`** - rota standalone fora do `MainLayout`, usa `useProtocolos().addProtocolo`
2. **`/configuracoes`** - dentro do `MainLayout` mas sem `ProtocolosProvider`, usa `useProtocolos().protocolos`

As demais páginas (Sobras, Motoristas, Clientes, Unidades, Usuarios, Numeros, LogsAuditoria, AlteracaoPedidos, RepresentantesNegocio) **não** usam `useProtocolos` e estão corretas.

---

## Plano de correção

### 1. Página `/configuracoes` - Adicionar ProtocolosProvider na rota

No `App.tsx`, envolver `Configuracoes` com `ProtocolosProvider`, igual ao Dashboard e Protocolos:

```tsx
<Route path="/configuracoes" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <ProtocolosProvider><Configuracoes /></ProtocolosProvider>
  </ProtectedRoute>
} />
```

### 2. Página `/abrir-protocolo` - Usar hook leve ao invés do contexto pesado

A página `AbrirProtocolo` só precisa de `addProtocolo`. Em vez de carregar todos os 3.400+ protocolos via `ProtocolosProvider`, trocar para o hook leve `useAddProtocolo` que já existe:

- Substituir `import { useProtocolos }` por `import { useAddProtocolo }`
- Trocar `const { addProtocolo } = useProtocolos()` por `const { addProtocolo } = useAddProtocolo()`

Isso mantém a página rápida sem precisar do provider pesado.

---

## Detalhes técnicos

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Envolver rota `/configuracoes` com `ProtocolosProvider` |
| `src/pages/AbrirProtocolo.tsx` | Trocar `useProtocolos` por `useAddProtocolo` |

