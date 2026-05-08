CREATE OR REPLACE FUNCTION public.get_dashboard_resumo(
  p_unidades text[] DEFAULT NULL,
  p_data_inicio text DEFAULT NULL,
  p_data_fim text DEFAULT NULL
)
RETURNS TABLE(
  sobras_total bigint,
  sobras_pendente bigint,
  sobras_andamento bigint,
  sobras_resolvido bigint,
  sobras_erro_carregamento bigint,
  sobras_erro_entrega bigint,
  trocas_total bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT p.status, p.causa, p.tipo_reposicao
    FROM public.protocolos p
    WHERE p.ativo = true
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
    COUNT(*) FILTER (WHERE tipo_reposicao = 'pos_rota') AS sobras_total,
    COUNT(*) FILTER (WHERE tipo_reposicao = 'pos_rota' AND status = 'aberto') AS sobras_pendente,
    COUNT(*) FILTER (WHERE tipo_reposicao = 'pos_rota' AND status = 'em_andamento') AS sobras_andamento,
    COUNT(*) FILTER (WHERE tipo_reposicao = 'pos_rota' AND status = 'encerrado') AS sobras_resolvido,
    COUNT(*) FILTER (WHERE tipo_reposicao = 'pos_rota' AND UPPER(COALESCE(causa,'')) LIKE '%ERRO DE CARREGAMENTO%') AS sobras_erro_carregamento,
    COUNT(*) FILTER (WHERE tipo_reposicao = 'pos_rota' AND UPPER(COALESCE(causa,'')) LIKE '%ERRO DE ENTREGA%') AS sobras_erro_entrega,
    COUNT(*) FILTER (WHERE tipo_reposicao = 'troca') AS trocas_total
  FROM base;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_resumo(text[], text, text) TO authenticated;