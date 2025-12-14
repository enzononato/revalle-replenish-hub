-- Tabela de produtos para autocomplete
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod TEXT NOT NULL UNIQUE,
  produto TEXT NOT NULL,
  embalagem TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública (produtos são dados públicos)
CREATE POLICY "Permitir leitura de produtos" ON public.produtos
  FOR SELECT USING (true);

-- Tabela de PDVs para autocomplete
CREATE TABLE public.pdvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.pdvs ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública (PDVs são dados públicos)
CREATE POLICY "Permitir leitura de PDVs" ON public.pdvs
  FOR SELECT USING (true);