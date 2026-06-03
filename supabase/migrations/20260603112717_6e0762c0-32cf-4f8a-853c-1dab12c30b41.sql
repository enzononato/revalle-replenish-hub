UPDATE public.protocolos 
SET oculto = true 
WHERE numero = 'RPF-2026060219304598';

INSERT INTO public.audit_logs (tabela, registro_id, acao, usuario_nome, registro_dados)
VALUES ('protocolos', 'RPF-2026060219304598', 'ocultar_duplicata', 'Sistema', 
  jsonb_build_object('motivo', 'Duplicata do RPF-2026060219304397 - mesma PDV/NF/causa em janela de ~18s'));