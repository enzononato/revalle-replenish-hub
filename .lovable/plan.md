

## Filtro Multi-Unidade no Dashboard e Protocolos

### O que muda

Atualmente, o filtro de unidade permite selecionar apenas **uma unidade por vez** (usando um Select simples). A mudanca substitui esse Select por um componente de **multi-selecao com checkboxes**, permitindo marcar varias unidades simultaneamente. Isso vale para:

1. **Dashboard** (admin): trocar o Select de unidade por um dropdown com checkboxes
2. **Protocolos** (admin): mesma troca
3. **Usuarios com multiplas unidades** (nao-admin): ao inves de mostrar dados de todas as unidades automaticamente, permitir que filtrem/desmarquem unidades especificas dentro das que tem acesso

---

### Como vai funcionar

- Um botao dropdown mostra "Todas as Unidades" ou os nomes das selecionadas (ex: "Juazeiro, Bonfim")
- Ao clicar, abre um popover com checkboxes para cada unidade
- Opcao "Selecionar Todas" / "Limpar" no topo
- Para nao-admins com multiplas unidades, as opcoes sao apenas as unidades atribuidas ao usuario
- A filtragem dos protocolos usa um array de unidades selecionadas ao inves de uma string unica

---

### Detalhes tecnicos

**Novo componente: `src/components/ui/MultiSelectUnidade.tsx`**
- Componente reutilizavel baseado em Popover + Checkbox
- Props: `unidades` (lista), `selected` (array de nomes selecionados), `onChange` (callback), `placeholder`
- Exibe um botao com os nomes selecionados (truncados) ou "Todas as Unidades"
- Dentro do popover: checkbox "Todas", seguido de checkbox para cada unidade

**Arquivo: `src/pages/Dashboard.tsx`**
- Trocar `useState<string>('todas')` por `useState<string[]>([])` (array vazio = todas)
- Substituir o `<Select>` de unidade pelo novo `<MultiSelectUnidade>`
- Atualizar a logica de `protocolosFiltrados`:
  - Se `unidadesFiltro.length === 0`: mostrar todas (equivalente ao "todas" atual)
  - Se `unidadesFiltro.length > 0`: filtrar por `unidadesFiltro.includes(p.unidadeNome)`
- Para nao-admins com multiplas unidades: inicializar com todas as unidades do usuario, mas permitir desmarcar
- Atualizar `totalMotoristasBase` com a mesma logica de array
- Usar `useUnidadesDB()` em vez de `mockUnidades` (dados reais do banco)

**Arquivo: `src/pages/Protocolos.tsx`**
- Trocar `unidadeFilter: string` por `unidadeFilters: string[]`
- Substituir o `<Select>` de unidade pelo `<MultiSelectUnidade>`
- Atualizar `filteredProtocolos`:
  - Admin: se array vazio, mostra tudo; se com valores, filtra por includes
  - Nao-admin: inicializar com as unidades do usuario, filtrar por interseccao
- Atualizar `clearFilters` e `hasActiveFilters` para usar o array
- Atualizar o `useEffect` de reset de pagina

**Arquivo: `src/pages/Dashboard.tsx` (adicional)**
- Remover import de `mockUnidades` e usar `useUnidadesDB()` para listar unidades reais do banco

---

### Resumo do impacto

| Pagina | Antes | Depois |
|---|---|---|
| Dashboard (admin) | Select com 1 unidade | Multi-select com checkboxes |
| Dashboard (nao-admin multi-unidade) | Ve tudo, sem filtro | Multi-select com suas unidades |
| Protocolos (admin) | Select com 1 unidade | Multi-select com checkboxes |
| Protocolos (nao-admin multi-unidade) | Ve tudo, sem filtro | Multi-select com suas unidades |

