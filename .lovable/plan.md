

## Fix: Unidade Filter Style Consistency on Protocolos Page

The Unidade filter currently uses the `MultiSelectUnidade` component (Popover + Checkboxes), which has a different visual style compared to all the other filters (Status, Lancado, Validado, Tipo) that use the standard `Select` component. This creates a visual inconsistency as seen in the screenshot.

### Solution

Replace the `MultiSelectUnidade` component with a standard `Select` dropdown on the Protocolos page, matching the style of the other filters. Since filtering by a single unit at a time is sufficient for this page, we'll use a simple `Select` with options for "Todas" plus each available unit.

### Technical Details

**File: `src/pages/Protocolos.tsx`**

1. Remove the `MultiSelectUnidade` import
2. Replace the multi-select component (lines 621-640) with a standard `Select` component styled like the other filters (Lancado, Validado, Tipo)
3. Change state from `unidadeFilters: string[]` to `unidadeFilter: string` (single value, default `'todas'`)
4. Update the filtering logic (lines 144-153) to work with a single string value instead of an array
5. Update `clearFilters` and `hasActiveFilters` to use the new single-value state
6. Update the `useEffect` dependency array for page reset

The new Unidade filter will look like:
```
<Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
  <SelectTrigger className="h-8 text-xs">
    <SelectValue placeholder="Todas" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="todas">Todas</SelectItem>
    {unidadesDisponiveis.map(u => (
      <SelectItem key={u.id} value={u.nome}>{u.nome}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

This ensures visual consistency across all filter dropdowns on the Protocolos page.

