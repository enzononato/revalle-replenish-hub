
-- 1. MOTORISTAS: Remove anon SELECT, keep only authenticated
DROP POLICY IF EXISTS "Acesso público leitura motoristas" ON public.motoristas;
CREATE POLICY "Apenas autenticados podem ler motoristas"
  ON public.motoristas FOR SELECT
  TO authenticated
  USING (true);

-- 2. USER_PROFILES: Restrict UPDATE to own profile or admin
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar user_profiles" ON public.user_profiles;
CREATE POLICY "Usuários podem atualizar próprio perfil ou admin"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. AUDIT_LOGS: Restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Acesso público leitura audit_logs" ON public.audit_logs;
CREATE POLICY "Apenas autenticados podem ler audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (true);

-- 4. GESTORES: Restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Acesso público leitura gestores" ON public.gestores;
CREATE POLICY "Apenas autenticados podem ler gestores"
  ON public.gestores FOR SELECT
  TO authenticated
  USING (true);

-- 5. USER_PROFILES: Restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Acesso público leitura user_profiles" ON public.user_profiles;
CREATE POLICY "Apenas autenticados podem ler user_profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);
