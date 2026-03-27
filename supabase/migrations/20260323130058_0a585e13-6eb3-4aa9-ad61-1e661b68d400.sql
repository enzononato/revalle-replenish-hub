DROP VIEW IF EXISTS public.motoristas_public;

CREATE VIEW public.motoristas_public WITH (security_invoker=on) AS
  SELECT id, created_at, nome, codigo, cpf, data_nascimento, unidade, funcao, setor, whatsapp, email
  FROM public.motoristas;