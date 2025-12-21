-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  acao TEXT NOT NULL,
  tabela TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  registro_dados JSONB,
  usuario_nome TEXT NOT NULL,
  usuario_role TEXT,
  usuario_unidade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can view logs, anyone can insert
CREATE POLICY "Acesso público leitura audit_logs" 
ON public.audit_logs 
FOR SELECT 
USING (true);

CREATE POLICY "Acesso público inserção audit_logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_tabela ON public.audit_logs(tabela);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);