

## Exportar Fotos no Backup

### Situacao atual
As fotos dos protocolos ficam armazenadas no bucket de arquivos (`fotos-protocolos`), separadas dos dados do banco. O backup atual exporta apenas os dados em JSON, sem incluir as imagens.

### Proposta

Adicionar um botao separado na aba Backup chamado **"Exportar Fotos do Sistema"** que:

1. Lista todos os arquivos no bucket de armazenamento `fotos-protocolos`
2. Baixa cada foto
3. Empacota tudo em um arquivo ZIP com a estrutura de pastas original (ex: `REP-001/foto.jpg`)
4. Dispara o download automatico do ZIP

Tambem sera adicionada a opcao de **"Exportar Backup Completo"** que combina dados JSON + fotos em um unico ZIP.

### Como vai funcionar para o usuario

- Na aba Backup, alem do botao existente de exportar dados, aparece um novo botao **"Exportar Fotos"**
- Ao clicar, uma barra de progresso mostra quantas fotos ja foram baixadas (ex: "Baixando 45 de 120 fotos...")
- O download do ZIP e disparado automaticamente ao concluir
- Se houver muitas fotos, o processo pode levar alguns minutos

### Detalhes tecnicos

**Dependencia nova:** `jszip` - biblioteca para criar arquivos ZIP no navegador

**Arquivo: `src/pages/Configuracoes.tsx`**
- Adicionar funcao `handleExportFotos` que:
  - Usa `supabase.storage.from('fotos-protocolos').list()` para listar pastas (cada protocolo tem uma pasta)
  - Para cada pasta, lista os arquivos dentro dela
  - Baixa cada arquivo usando `supabase.storage.from('fotos-protocolos').download(path)`
  - Adiciona ao ZIP mantendo a estrutura de pastas
  - Gera o ZIP e dispara download
- Adicionar estado de progresso (`totalFotos`, `fotosProcessadas`)
- Novo botao com icone de camera/imagem na secao de Backup

**Tratamento de limites:**
- A listagem do storage retorna no maximo 100 itens por chamada, entao sera feita paginacao
- Downloads em lote de 5 fotos simultaneas para nao sobrecarregar o navegador
- Tratamento de erro individual por foto (se uma falhar, continua com as outras)

**UI na aba Backup:**
- Card separado para "Exportar Fotos" com contagem de fotos armazenadas
- Barra de progresso visual durante o download
- Botao desabilitado durante o processo com spinner

