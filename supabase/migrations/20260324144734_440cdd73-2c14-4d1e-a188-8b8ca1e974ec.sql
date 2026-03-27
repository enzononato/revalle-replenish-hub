
-- Create representantes table
CREATE TABLE public.representantes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cpf text NOT NULL UNIQUE,
  unidade text NOT NULL,
  senha text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.representantes ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated can CRUD
CREATE POLICY "Apenas autenticados podem ler representantes"
  ON public.representantes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir representantes"
  ON public.representantes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar representantes"
  ON public.representantes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar representantes"
  ON public.representantes FOR DELETE TO authenticated USING (true);

-- Create public view excluding senha
CREATE VIEW public.representantes_public WITH (security_invoker = true) AS
  SELECT id, nome, cpf, unidade, created_at
  FROM public.representantes;

-- Uppercase trigger for nome
CREATE OR REPLACE FUNCTION public.handle_representante_nome_uppercase()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.nome = UPPER(NEW.nome);
  RETURN NEW;
END;
$$;

CREATE TRIGGER representante_nome_uppercase
  BEFORE INSERT OR UPDATE ON public.representantes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_representante_nome_uppercase();
