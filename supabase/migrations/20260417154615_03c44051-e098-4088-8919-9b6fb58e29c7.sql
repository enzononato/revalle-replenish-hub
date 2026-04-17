-- Tabela para registrar erros de sincronização do Auth
CREATE TABLE IF NOT EXISTS public.auth_sync_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  error_message TEXT NOT NULL,
  error_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_sync_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler auth_sync_errors"
ON public.auth_sync_errors
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar auth_sync_errors"
ON public.auth_sync_errors
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sistema pode inserir auth_sync_errors"
ON public.auth_sync_errors
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Reforçar trigger handle_new_user com tratamento de erro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.user_profiles (user_email, nome)
    VALUES (NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email))
    ON CONFLICT (user_email) DO UPDATE
      SET nome = EXCLUDED.nome;
  EXCEPTION WHEN OTHERS THEN
    -- Registrar erro mas não bloquear criação do usuário no Auth
    INSERT INTO public.auth_sync_errors (user_id, user_email, error_message, error_context)
    VALUES (NEW.id, NEW.email, SQLERRM, 'handle_new_user trigger - user_profiles insert');
  END;
  RETURN NEW;
END;
$function$;