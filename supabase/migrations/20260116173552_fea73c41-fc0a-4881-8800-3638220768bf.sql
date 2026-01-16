-- Adicionar coluna CPF na tabela motoristas
ALTER TABLE public.motoristas ADD COLUMN cpf text;

-- Criar índice para buscas por CPF
CREATE INDEX idx_motoristas_cpf ON public.motoristas(cpf);