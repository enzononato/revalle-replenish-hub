CREATE OR REPLACE FUNCTION public.get_dashboard_protocolos_por_dia(
  p_unidades text[] DEFAULT NULL,
  p_data_inicio text DEFAULT NULL,
  p_data_fim text DEFAULT NULL
)
RETURNS TABLE(
  dia text,
  aberto bigint,
  em_andamento bigint,
  encerrado bigint,
  total bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      TO_CHAR(TO_DATE(p.data, 'DD/MM/YYYY'), 'YYYY-MM-DD') AS dia,
      p.status
    FROM public.protocolos p
    WHERE p.ativo = true
      AND COALESCE(p.oculto, false) = false
      AND COALESCE(p.tipo_reposicao, '') NOT IN ('pos_rota', 'troca')
      AND (p_unidades IS NULL OR p.motorista_unidade = ANY(p_unidades))
      AND (
        p_data_inicio IS NULL
        OR TO_DATE(p.data, 'DD/MM/YYYY') >= TO_DATE(p_data_inicio, 'YYYY-MM-DD')
      )
      AND (
        p_data_fim IS NULL
        OR TO_DATE(p.data, 'DD/MM/YYYY') <= TO_DATE(p_data_fim, 'YYYY-MM-DD')
      )
  )
  SELECT
    dia,
    COUNT(*) FILTER (WHERE status = 'aberto')::bigint AS aberto,
    COUNT(*) FILTER (WHERE status = 'em_andamento')::bigint AS em_andamento,
    COUNT(*) FILTER (WHERE status = 'encerrado')::bigint AS encerrado,
    COUNT(*)::bigint AS total
  FROM base
  GROUP BY dia
  ORDER BY dia;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_protocolos_por_dia(text[], text, text) TO authenticated;