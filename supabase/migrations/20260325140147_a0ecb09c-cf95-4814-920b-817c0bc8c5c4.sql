-- Index for the main protocolos query: SELECT * WHERE ativo=true ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_protocolos_ativo_created_at ON public.protocolos (ativo, created_at DESC);

-- Index for status filtering (used in Dashboard tabs: aberto, em_andamento, encerrado)
CREATE INDEX IF NOT EXISTS idx_protocolos_status ON public.protocolos (status);

-- Index for motorista_unidade filtering (used in RN portal and unit-based queries)
CREATE INDEX IF NOT EXISTS idx_protocolos_motorista_unidade ON public.protocolos (motorista_unidade);

-- Index for codigo_pdv filtering (used in RN portal search)
CREATE INDEX IF NOT EXISTS idx_protocolos_codigo_pdv ON public.protocolos (codigo_pdv);

-- Index for tipo_reposicao filtering (used in Sobras page)
CREATE INDEX IF NOT EXISTS idx_protocolos_tipo_reposicao ON public.protocolos (tipo_reposicao);

-- Index for audit_logs server-side pagination
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tabela ON public.audit_logs (tabela);
CREATE INDEX IF NOT EXISTS idx_audit_logs_acao ON public.audit_logs (acao);

-- Index for motorista_login_logs pagination
CREATE INDEX IF NOT EXISTS idx_motorista_login_logs_created_at ON public.motorista_login_logs (created_at DESC);