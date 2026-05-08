CREATE OR REPLACE FUNCTION public.get_dashboard_top_pdvs(
  p_unidades text[] DEFAULT NULL,
  p_data_inicio text DEFAULT NULL,
  p_data_fim text DEFAULT NULL,
  p_limite int DEFAULT 5
)
RETURNS TABLE(
  codigo text,
  nome text,
  total bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH agregado AS (
    SELECT
      COALESCE(p.codigo_pdv, 'Sem PDV') AS codigo,
      COUNT(*)::bigint AS total
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
    GROUP BY COALESCE(p.codigo_pdv, 'Sem PDV')
    ORDER BY total DESC
    LIMIT GREATEST(p_limite, 1)
  )
  SELECT
    a.codigo,
    COALESCE(
      (SELECT pd.nome FROM public.pdvs pd WHERE pd.codigo = a.codigo LIMIT 1),
      a.codigo
    ) AS nome,
    a.total
  FROM agregado a
  ORDER BY a.total DESC;
$$;