-- Função para contar PDVs por unidade (agrupado)
CREATE OR REPLACE FUNCTION public.count_pdvs_por_unidade()
RETURNS TABLE(unidade text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT UPPER(TRIM(p.unidade)) as unidade, COUNT(*) as total
  FROM public.pdvs p
  WHERE p.unidade IS NOT NULL AND TRIM(p.unidade) != ''
  GROUP BY UPPER(TRIM(p.unidade));
$$;

-- Função para contar protocolos por unidade (agrupado, com filtro de data opcional)
CREATE OR REPLACE FUNCTION public.count_protocolos_por_unidade(
  data_inicio text DEFAULT NULL,
  data_fim text DEFAULT NULL
)
RETURNS TABLE(unidade text, total bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.motorista_unidade as unidade, COUNT(*) as total
  FROM public.protocolos p
  WHERE p.motorista_unidade IS NOT NULL
    AND (
      data_inicio IS NULL 
      OR TO_DATE(p.data, 'DD/MM/YYYY') >= TO_DATE(data_inicio, 'YYYY-MM-DD')
    )
    AND (
      data_fim IS NULL 
      OR TO_DATE(p.data, 'DD/MM/YYYY') <= TO_DATE(data_fim, 'YYYY-MM-DD')
    )
  GROUP BY p.motorista_unidade;
END;
$$;