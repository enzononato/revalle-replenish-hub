-- TOP PDVs com nome resolvido
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
  SELECT
    COALESCE(p.codigo_pdv, 'Sem PDV') AS codigo,
    COALESCE(MAX(pd.nome), COALESCE(p.codigo_pdv, 'Sem PDV')) AS nome,
    COUNT(*)::bigint AS total
  FROM public.protocolos p
  LEFT JOIN public.pdvs pd
    ON pd.codigo = p.codigo_pdv
   AND (p.motorista_unidade IS NULL OR pd.unidade = p.motorista_unidade)
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
  LIMIT GREATEST(p_limite, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_top_pdvs(text[], text, text, int) TO authenticated;

-- Série de abertos × encerrados por dia ou mês
CREATE OR REPLACE FUNCTION public.get_dashboard_protocolos_por_periodo(
  p_unidades text[] DEFAULT NULL,
  p_data_inicio text DEFAULT NULL,
  p_data_fim text DEFAULT NULL,
  p_granularidade text DEFAULT 'dia'
)
RETURNS TABLE(
  periodo text,
  abertos bigint,
  encerrados bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      p.id,
      p.status,
      TO_DATE(p.data, 'DD/MM/YYYY') AS data_abertura,
      (
        SELECT TO_DATE(elem ->> 'data', 'DD/MM/YYYY')
        FROM jsonb_array_elements(COALESCE(p.observacoes_log, '[]'::jsonb)) elem
        WHERE elem ->> 'acao' LIKE 'Encerrou o protocolo%'
        ORDER BY TO_DATE(elem ->> 'data', 'DD/MM/YYYY') DESC NULLS LAST
        LIMIT 1
      ) AS data_encerramento
    FROM public.protocolos p
    WHERE p.ativo = true
      AND COALESCE(p.oculto, false) = false
      AND COALESCE(p.tipo_reposicao, '') NOT IN ('pos_rota', 'troca')
      AND (p_unidades IS NULL OR p.motorista_unidade = ANY(p_unidades))
  ),
  abertos_por_periodo AS (
    SELECT
      CASE
        WHEN p_granularidade = 'mes'
          THEN TO_CHAR(date_trunc('month', data_abertura), 'YYYY-MM')
        ELSE TO_CHAR(data_abertura, 'YYYY-MM-DD')
      END AS periodo,
      COUNT(*)::bigint AS qtd
    FROM base
    WHERE data_abertura IS NOT NULL
      AND (p_data_inicio IS NULL OR data_abertura >= TO_DATE(p_data_inicio, 'YYYY-MM-DD'))
      AND (p_data_fim    IS NULL OR data_abertura <= TO_DATE(p_data_fim,    'YYYY-MM-DD'))
    GROUP BY 1
  ),
  encerrados_por_periodo AS (
    SELECT
      CASE
        WHEN p_granularidade = 'mes'
          THEN TO_CHAR(date_trunc('month', data_encerramento), 'YYYY-MM')
        ELSE TO_CHAR(data_encerramento, 'YYYY-MM-DD')
      END AS periodo,
      COUNT(*)::bigint AS qtd
    FROM base
    WHERE status = 'encerrado'
      AND data_encerramento IS NOT NULL
      AND (p_data_inicio IS NULL OR data_encerramento >= TO_DATE(p_data_inicio, 'YYYY-MM-DD'))
      AND (p_data_fim    IS NULL OR data_encerramento <= TO_DATE(p_data_fim,    'YYYY-MM-DD'))
    GROUP BY 1
  )
  SELECT
    COALESCE(a.periodo, e.periodo) AS periodo,
    COALESCE(a.qtd, 0) AS abertos,
    COALESCE(e.qtd, 0) AS encerrados
  FROM abertos_por_periodo a
  FULL OUTER JOIN encerrados_por_periodo e USING (periodo)
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_protocolos_por_periodo(text[], text, text, text) TO authenticated;