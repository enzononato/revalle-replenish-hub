-- Criar tabela de gestores para armazenar números de contato por unidade
CREATE TABLE public.gestores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  whatsapp text NOT NULL,
  unidades text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.gestores ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (mesmo padrão das outras tabelas)
CREATE POLICY "Acesso público leitura gestores" ON public.gestores
FOR SELECT USING (true);

CREATE POLICY "Acesso público inserção gestores" ON public.gestores
FOR INSERT WITH CHECK (true);

CREATE POLICY "Acesso público atualização gestores" ON public.gestores
FOR UPDATE USING (true);

CREATE POLICY "Acesso público deleção gestores" ON public.gestores
FOR DELETE USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_gestores_updated_at
BEFORE UPDATE ON public.gestores
FOR EACH ROW
EXECUTE FUNCTION public.update_user_profile_updated_at();