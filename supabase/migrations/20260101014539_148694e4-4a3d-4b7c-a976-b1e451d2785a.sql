-- Atualizar todos os nomes existentes para maiúsculas
UPDATE public.motoristas 
SET nome = UPPER(nome) 
WHERE nome != UPPER(nome);

-- Criar função de trigger para converter nomes automaticamente
CREATE OR REPLACE FUNCTION public.handle_motorista_nome_uppercase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.nome = UPPER(NEW.nome);
  RETURN NEW;
END;
$$;

-- Criar trigger que executa antes de inserir ou atualizar
CREATE TRIGGER on_motorista_nome_uppercase
  BEFORE INSERT OR UPDATE ON public.motoristas
  FOR EACH ROW EXECUTE FUNCTION public.handle_motorista_nome_uppercase();