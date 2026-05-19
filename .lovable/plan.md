## Objetivo

A página `/trocas` precisa ter **exatamente as mesmas funcionalidades** da página `/protocolos` (Reposição) — confirmação de envio, reenvio, validar, lançar, encerrar, histórico de envios, filtros de data/lançado/validado/unidade, SLA, paginação, exportação, ações em massa, modal de detalhes etc. Hoje ela é uma listagem simplificada de leitura+encerrar, sem nenhuma dessas features.

## Estratégia

Transformar `Protocolos.tsx` em um componente parametrizado por **escopo** (`reposicao` | `troca`) e fazer `Trocas.tsx` virar um wrapper que renderiza o mesmo componente com `scope="troca"`. Isso garante 100% de paridade de features hoje e no futuro — qualquer melhoria na página de Protocolos aparece automaticamente em Trocas.

## Mudanças

### 1. `src/pages/Protocolos.tsx`

- Receber prop opcional `scope?: 'reposicao' | 'troca'` (default `'reposicao'`).
- **Filtro de dados** (linhas 161-162 do `useMemo`):
  - `scope === 'reposicao'` → exclui `pos_rota` e `troca` (comportamento atual).
  - `scope === 'troca'` → inclui apenas `tipo_reposicao === 'troca'`.
- **Cabeçalho da página**:
  - Reposição: título "Protocolos" + ícone `FileText` (atual).
  - Troca: título "Trocas" + ícone `Repeat` + subtítulo "Protocolos de troca abertos pelos RNs".
- **Filtro "Tipo"** (linha 637):
  - Reposição: mantém `Inversão / Avaria / Falta` (atual).
  - Troca: substitui pelas causas reais de troca presentes no banco — `01 - Vencido`, `02 - Embalagem Avariada`, `05 - Mal Cheio`, `06 - Sem data de Validade`, `09 - Produto Impróprio`, `Vencido`, `Impureza`, `Mal cheiro`, `Fora do Prazo Comercial`. O matching usa `p.causa` em vez de `p.tipoReposicao` quando `scope === 'troca'`.
- **Botão "Novo protocolo"** (`CreateProtocoloModal`): oculto em `scope === 'troca'` (trocas são criadas pelos RNs via `TrocaForm`).
- Demais blocos (lista, ações, modal `ProtocoloDetails`, `HistoricoEnvios`, webhooks, audit log, SLA) **não mudam** — funcionam igual para qualquer protocolo, independentemente do tipo.

### 2. `src/pages/Trocas.tsx`

Substituir o conteúdo atual (515 linhas) por um wrapper de 4 linhas:

```tsx
import Protocolos from './Protocolos';
export default function Trocas() {
  return <Protocolos scope="troca" />;
}
```

A página atual de Trocas é descartada — todas as ações específicas (marcar em andamento, encerrar, excluir) já existem no fluxo de `ProtocoloDetails` usado em Protocolos, com mais recursos.

### 3. Roteamento

`src/App.tsx` continua importando `Trocas` em `/trocas` — nenhuma mudança.

## Detalhes técnicos

- O `ProtocolosContext` já carrega **todos** os protocolos (inclusive trocas e pós-rota), então não precisa de mudança no contexto nem nova query.
- `ProtocoloDetails`, `HistoricoEnvios` e os webhooks de envio/encerramento já são genéricos quanto ao `tipo_reposicao`.
- Visibilidade por unidade (admin vs. não-admin) é a mesma lógica de hoje em Protocolos, então RNs/distribuição continuam vendo só a(s) sua(s) unidade(s).
- URL params (`?status=`, `?periodo=`, `?tipo=`, `?unidade=`) seguem funcionando em `/trocas`.

## Verificação após implementar

1. Abrir `/trocas` → mesma UI da página Protocolos, com título "Trocas", listando apenas `tipo_reposicao = 'troca'`.
2. Confirmar que aparecem: botões Validar, Lançar, Enviar, Reenviar, Encerrar; chips de SLA; filtros de data/lançado/validado/unidade; paginação; histórico de envios no modal.
3. Filtro Tipo mostra as causas de troca (Vencido, Embalagem Avariada, etc.).
4. Abrir `/protocolos` → continua sem listar trocas nem pós-rota (comportamento atual preservado).
