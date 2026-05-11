
-- 1. Substituir a política pública de SELECT em protocolos para excluir CME
DROP POLICY IF EXISTS "Acesso público leitura protocolos" ON public.protocolos;

CREATE POLICY "Leitura protocolos exceto CME"
ON public.protocolos
FOR SELECT
TO anon, authenticated
USING (
  auth.uid() IS NULL
  OR NOT public.has_role(auth.uid(), 'cme'::app_role)
);

-- 2. Função SECURITY DEFINER para CME consultar por codigo_pdv
CREATE OR REPLACE FUNCTION public.get_protocolos_by_codigo_pdv(p_codigo text)
RETURNS SETOF public.protocolos
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Exige autenticação
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Exige código de PDV não vazio (impede listar tudo)
  IF p_codigo IS NULL OR length(trim(p_codigo)) = 0 THEN
    RAISE EXCEPTION 'codigo_pdv é obrigatório';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.protocolos p
  WHERE p.codigo_pdv = trim(p_codigo)
    AND p.ativo = true
    AND COALESCE(p.oculto, false) = false
  ORDER BY p.created_at DESC
  LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_protocolos_by_codigo_pdv(text) TO authenticated;
