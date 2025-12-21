-- Adicionar coluna unidade na tabela pdvs
ALTER TABLE public.pdvs ADD COLUMN IF NOT EXISTS unidade text;

-- Adicionar colunas extras para os dados do CSV
ALTER TABLE public.pdvs ADD COLUMN IF NOT EXISTS bairro text;
ALTER TABLE public.pdvs ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.pdvs ADD COLUMN IF NOT EXISTS cidade text;

-- Criar índice para busca por unidade
CREATE INDEX IF NOT EXISTS idx_pdvs_unidade ON public.pdvs(unidade);

-- Criar índice composto para busca por código + unidade
CREATE INDEX IF NOT EXISTS idx_pdvs_codigo_unidade ON public.pdvs(codigo, unidade);