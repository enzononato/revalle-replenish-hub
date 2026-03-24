

## Plan: Portal dos Representantes de Negócio (RN)

### Overview
Create a new portal for RN (Representantes de Negócio) at `/rn/login` and `/rn/portal`, mirroring the motorista portal pattern. RNs can only view and search protocolos by PDV code across three tabs (Abertos, Em Atendimento, Encerrados). An admin management page allows CRUD on RNs.

### Database Changes

**1. New table `representantes`**
- `id` (uuid, PK)
- `nome` (text, NOT NULL)
- `cpf` (text, NOT NULL, UNIQUE)
- `unidade` (text, NOT NULL)
- `senha` (text, NOT NULL)
- `created_at` (timestamp)
- RLS: authenticated users can read/insert/update/delete (for admin management); anon blocked

**2. New view `representantes_public`** (excludes `senha` column, like `motoristas_public`)

### Edge Function

**`supabase/functions/rn-login/index.ts`**
- Accepts `{ cpf, senha }`
- Looks up by CPF in `representantes` table using service role
- Returns `{ success: true, representante }` or `{ success: false, error: '...' }` (status 200 pattern, matching motorista strategy)

### Frontend - Auth

**`src/contexts/RnAuthContext.tsx`**
- Same pattern as `MotoristaAuthContext`
- Stores session in `localStorage` key `rn_session`
- `login(cpf, senha)` calls `rn-login` edge function
- Wrap in `App.tsx`

### Frontend - Pages

**`src/pages/RnLogin.tsx`**
- Similar to `MotoristaLogin` but with "Portal do RN" branding and Briefcase icon
- Fields: CPF + Senha only (no "Código" option)
- On success, navigate to `/rn/portal`

**`src/pages/RnPortal.tsx`**
- Header with RN name, unidade, logout button
- Search input for PDV code
- Three tabs: Abertos, Em Atendimento, Encerrados
- Queries `protocolos` table filtered by `motorista_unidade = rn.unidade` and `codigo_pdv` search
- Read-only cards showing protocolo details (numero, motorista, PDV, data, status, produtos)
- No create/edit actions

**`src/pages/RepresentantesNegocio.tsx`** (admin management)
- Same pattern as `Motoristas.tsx`: table with search, filter by unidade, add/edit/delete dialogs
- Fields: Nome, CPF, Unidade, Senha
- Protected route for admin only

### Routing (App.tsx)

- `/rn` → redirect to `/rn/login`
- `/rn/login` → `RnLogin`
- `/rn/portal` → `RnPortal`
- `/representantes` → `RepresentantesNegocio` (inside MainLayout, admin-only ProtectedRoute)

### Sidebar

Add nav item:
```
{ icon: UserCheck, label: "RN's", path: '/representantes', roles: ['admin'] }
```

### Files to Create/Modify

| Action | File |
|--------|------|
| Create | `supabase/functions/rn-login/index.ts` |
| Create | `src/contexts/RnAuthContext.tsx` |
| Create | `src/pages/RnLogin.tsx` |
| Create | `src/pages/RnPortal.tsx` |
| Create | `src/pages/RepresentantesNegocio.tsx` |
| Create | `src/hooks/useRepresentantesDB.ts` |
| Modify | `src/App.tsx` (add routes + RnAuthProvider) |
| Modify | `src/components/layout/Sidebar.tsx` (add RN's nav item) |
| Migration | Create `representantes` table + `representantes_public` view |

