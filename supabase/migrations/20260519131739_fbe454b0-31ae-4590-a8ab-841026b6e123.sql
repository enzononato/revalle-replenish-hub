
-- 1) Função para gerar número de protocolo no backend
CREATE OR REPLACE FUNCTION public.generate_protocolo_numero(
  p_tipo  text,
  p_causa text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo     text := lower(coalesce(p_tipo, ''));
  v_causa    text;
  v_prefixo  text;
  v_inicial  text;
  v_ts       text;
  v_rand     text;
  v_candidato text;
  v_tentativa int := 0;
BEGIN
  -- Normaliza causa (UPPER, sem acento)
  IF p_causa IS NOT NULL THEN
    v_causa := upper(translate(
      p_causa,
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
    ));
  END IF;

  -- Determina prefixo
  IF v_tipo = 'reposicao' THEN
    IF v_causa = 'AVARIA' THEN
      v_prefixo := 'RPA';
    ELSIF v_causa = 'FALTA' THEN
      v_prefixo := 'RPF';
    ELSIF v_causa = 'INVERSAO' THEN
      v_prefixo := 'RPI';
    ELSIF v_causa IS NOT NULL AND length(v_causa) > 0 THEN
      v_inicial := substr(regexp_replace(v_causa, '[^A-Z]', '', 'g'), 1, 1);
      v_prefixo := 'RP' || coalesce(nullif(v_inicial, ''), 'X');
    ELSE
      v_prefixo := 'RP';
    END IF;
  ELSIF v_tipo = 'pos_rota' THEN
    v_prefixo := 'POSROTA';
  ELSIF v_tipo = 'troca' THEN
    v_prefixo := 'TROCA';
  ELSIF v_tipo = 'venda' THEN
    v_prefixo := 'VENDA';
  ELSE
    RAISE EXCEPTION 'Tipo de protocolo desconhecido: %', p_tipo;
  END IF;

  -- Tenta gerar número único (até 10 tentativas)
  LOOP
    v_tentativa := v_tentativa + 1;

    v_ts := to_char(
      (now() AT TIME ZONE 'America/Sao_Paulo'),
      'YYYYMMDDHH24MISS'
    );
    v_rand := lpad(floor(random() * 100)::int::text, 2, '0');
    v_candidato := v_prefixo || '-' || v_ts || v_rand;

    IF NOT EXISTS (
      SELECT 1 FROM public.protocolos WHERE numero = v_candidato
    ) THEN
      RETURN v_candidato;
    END IF;

    IF v_tentativa >= 10 THEN
      RAISE EXCEPTION 'Não foi possível gerar número único após 10 tentativas (prefixo: %)', v_prefixo;
    END IF;

    PERFORM pg_sleep(0.01);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_protocolo_numero(text, text) TO anon, authenticated;

-- 2) Garante unicidade do número
CREATE UNIQUE INDEX IF NOT EXISTS protocolos_numero_unique
  ON public.protocolos (numero);
