

## Problema identificado

No `BuscarProtocoloPdv.tsx`, quando aberto da aba "Em Atendimento" com `selectionMode='select'`, clicar num resultado pula direto para o modal de encerramento sem mostrar os detalhes. O motorista não consegue ver as informações antes de encerrar.

O comportamento desejado e um fluxo em duas etapas:
1. Clicar no resultado expande os detalhes do protocolo (produtos, observacao, NF, causa, etc.)
2. Dentro dos detalhes expandidos, aparece um botao "Encerrar Reposicao" que abre o modal de encerramento

## Mudanca

**Arquivo:** `src/components/motorista/BuscarProtocoloPdv.tsx`

- Alterar `handleSelectProtocolo` para que no modo `select` tambem faca toggle de expansao (igual ao modo `view`), em vez de fechar o dialog imediatamente
- No card expandido (quando `selectionMode === 'select'`), renderizar um botao "Encerrar Reposicao" que chama `onSelectProtocolo` e fecha o dialog
- Manter o modo `view` como somente leitura (sem botao de encerrar)

Resultado: o motorista clica no resultado, ve os detalhes do protocolo expandidos, e entao clica no botao "Encerrar Reposicao" para prosseguir para o modal de encerramento.

## Detalhes tecnicos

```text
BuscarProtocoloPdv (select mode)
  Card click → toggle protocoloExpandidoId (igual view)
  Card expandido:
    - mostra detalhes (produtos, obs, NF, causa, mapa)
    - renderiza botão "Encerrar Reposição" 
      → chama onSelectProtocolo(protocolo) + handleClose()
```

