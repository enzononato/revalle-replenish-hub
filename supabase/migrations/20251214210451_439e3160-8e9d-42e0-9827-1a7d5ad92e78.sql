-- Adicionar políticas RLS para INSERT e UPDATE na tabela produtos
CREATE POLICY "Permitir inserção de produtos" 
ON public.produtos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de produtos" 
ON public.produtos 
FOR UPDATE 
USING (true);