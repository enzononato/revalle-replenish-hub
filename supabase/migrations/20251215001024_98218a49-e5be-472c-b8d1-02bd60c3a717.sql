-- Criar tabela de unidades
CREATE TABLE public.unidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  cnpj TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Permitir leitura de unidades"
ON public.unidades
FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de unidades"
ON public.unidades
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização de unidades"
ON public.unidades
FOR UPDATE
USING (true);

CREATE POLICY "Permitir deleção de unidades"
ON public.unidades
FOR DELETE
USING (true);

-- Inserir unidades padrão baseadas nos dados mock
INSERT INTO public.unidades (nome, codigo) VALUES
  ('Revalle Alagoinhas', 'RAL'),
  ('Revalle Feira de Santana', 'RFS'),
  ('Revalle Salvador', 'RSA'),
  ('Revalle Vitória da Conquista', 'RVC');