
-- =============================================
-- CORREÇÕES DE SEGURANÇA RLS
-- Restringir INSERT/UPDATE/DELETE para usuários autenticados
-- =============================================

-- PROTOCOLOS
DROP POLICY IF EXISTS "Acesso público inserção protocolos" ON public.protocolos;
DROP POLICY IF EXISTS "Acesso público atualização protocolos" ON public.protocolos;
DROP POLICY IF EXISTS "Acesso público deleção protocolos" ON public.protocolos;

CREATE POLICY "Usuários autenticados podem inserir protocolos" 
ON public.protocolos FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar protocolos" 
ON public.protocolos FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar protocolos" 
ON public.protocolos FOR DELETE 
TO authenticated
USING (true);

-- MOTORISTAS
DROP POLICY IF EXISTS "Acesso público inserção motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Acesso público atualização motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Acesso público deleção motoristas" ON public.motoristas;

CREATE POLICY "Usuários autenticados podem inserir motoristas" 
ON public.motoristas FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar motoristas" 
ON public.motoristas FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar motoristas" 
ON public.motoristas FOR DELETE 
TO authenticated
USING (true);

-- PDVS
DROP POLICY IF EXISTS "Acesso público inserção pdvs" ON public.pdvs;
DROP POLICY IF EXISTS "Acesso público atualização pdvs" ON public.pdvs;
DROP POLICY IF EXISTS "Acesso público deleção pdvs" ON public.pdvs;

CREATE POLICY "Usuários autenticados podem inserir pdvs" 
ON public.pdvs FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar pdvs" 
ON public.pdvs FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar pdvs" 
ON public.pdvs FOR DELETE 
TO authenticated
USING (true);

-- PRODUTOS
DROP POLICY IF EXISTS "Acesso público inserção produtos" ON public.produtos;
DROP POLICY IF EXISTS "Acesso público atualização produtos" ON public.produtos;
DROP POLICY IF EXISTS "Acesso público deleção produtos" ON public.produtos;

CREATE POLICY "Usuários autenticados podem inserir produtos" 
ON public.produtos FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar produtos" 
ON public.produtos FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar produtos" 
ON public.produtos FOR DELETE 
TO authenticated
USING (true);

-- GESTORES
DROP POLICY IF EXISTS "Acesso público inserção gestores" ON public.gestores;
DROP POLICY IF EXISTS "Acesso público atualização gestores" ON public.gestores;
DROP POLICY IF EXISTS "Acesso público deleção gestores" ON public.gestores;

CREATE POLICY "Usuários autenticados podem inserir gestores" 
ON public.gestores FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar gestores" 
ON public.gestores FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar gestores" 
ON public.gestores FOR DELETE 
TO authenticated
USING (true);

-- UNIDADES
DROP POLICY IF EXISTS "Acesso público inserção unidades" ON public.unidades;
DROP POLICY IF EXISTS "Acesso público atualização unidades" ON public.unidades;
DROP POLICY IF EXISTS "Acesso público deleção unidades" ON public.unidades;

CREATE POLICY "Usuários autenticados podem inserir unidades" 
ON public.unidades FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar unidades" 
ON public.unidades FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar unidades" 
ON public.unidades FOR DELETE 
TO authenticated
USING (true);

-- CHAT_PARTICIPANTS
DROP POLICY IF EXISTS "Acesso público inserção chat_participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Acesso público atualização chat_participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Acesso público deleção chat_participants" ON public.chat_participants;

CREATE POLICY "Usuários autenticados podem inserir chat_participants" 
ON public.chat_participants FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar chat_participants" 
ON public.chat_participants FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar chat_participants" 
ON public.chat_participants FOR DELETE 
TO authenticated
USING (true);

-- CHAT_CONVERSATIONS
DROP POLICY IF EXISTS "Acesso público inserção chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Acesso público atualização chat_conversations" ON public.chat_conversations;

CREATE POLICY "Usuários autenticados podem inserir chat_conversations" 
ON public.chat_conversations FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar chat_conversations" 
ON public.chat_conversations FOR UPDATE 
TO authenticated
USING (true);

-- CHAT_MESSAGES
DROP POLICY IF EXISTS "Acesso público inserção chat_messages" ON public.chat_messages;

CREATE POLICY "Usuários autenticados podem inserir chat_messages" 
ON public.chat_messages FOR INSERT 
TO authenticated
WITH CHECK (true);

-- USER_PROFILES
DROP POLICY IF EXISTS "Acesso público inserção user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Acesso público atualização user_profiles" ON public.user_profiles;

CREATE POLICY "Usuários autenticados podem inserir user_profiles" 
ON public.user_profiles FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar user_profiles" 
ON public.user_profiles FOR UPDATE 
TO authenticated
USING (true);

-- AUDIT_LOGS
DROP POLICY IF EXISTS "Acesso público inserção audit_logs" ON public.audit_logs;

CREATE POLICY "Usuários autenticados podem inserir audit_logs" 
ON public.audit_logs FOR INSERT 
TO authenticated
WITH CHECK (true);
