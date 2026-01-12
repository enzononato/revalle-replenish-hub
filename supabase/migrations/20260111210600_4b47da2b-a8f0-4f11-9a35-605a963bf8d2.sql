-- Adicionar colunas para rastreabilidade do encerramento pelo motorista
ALTER TABLE protocolos ADD COLUMN IF NOT EXISTS encerrado_por_tipo TEXT DEFAULT 'admin';
ALTER TABLE protocolos ADD COLUMN IF NOT EXISTS encerrado_por_motorista_id TEXT;
ALTER TABLE protocolos ADD COLUMN IF NOT EXISTS encerrado_por_motorista_nome TEXT;
ALTER TABLE protocolos ADD COLUMN IF NOT EXISTS foto_nota_fiscal_encerramento TEXT;
ALTER TABLE protocolos ADD COLUMN IF NOT EXISTS foto_entrega_mercadoria TEXT;