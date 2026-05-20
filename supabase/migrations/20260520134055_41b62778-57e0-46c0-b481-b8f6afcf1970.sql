
CREATE OR REPLACE FUNCTION public.count_protocolos_por_unidade(data_inicio text DEFAULT NULL::text, data_fim text DEFAULT NULL::text)
 RETURNS TABLE(unidade text, total bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.motorista_unidade as unidade, COUNT(*) as total
  FROM public.protocolos p
  WHERE p.motorista_unidade IS NOT NULL
    AND p.ativo = true
    AND COALESCE(p.oculto, false) = false
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
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_resumo(p_unidades text[] DEFAULT NULL::text[], p_data_inicio text DEFAULT NULL::text, p_data_fim text DEFAULT NULL::text)
 RETURNS TABLE(sobras_total bigint, sobras_pendente bigint, sobras_andamento bigint, sobras_resolvido bigint, sobras_erro_carregamento bigint, sobras_erro_entrega bigint, trocas_total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT p.status, p.causa, p.tipo_reposicao
    FROM public.protocolos p
    WHERE p.ativo = true
      AND COALESCE(p.oculto, false) = false
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
$function$;
