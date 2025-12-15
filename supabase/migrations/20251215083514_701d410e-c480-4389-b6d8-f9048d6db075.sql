-- Remover políticas RESTRICTIVE existentes da tabela protocolos
DROP POLICY IF EXISTS "Permitir inserção de protocolos" ON protocolos;
DROP POLICY IF EXISTS "Permitir leitura de protocolos" ON protocolos;
DROP POLICY IF EXISTS "Permitir atualização de protocolos" ON protocolos;
DROP POLICY IF EXISTS "Permitir deleção de protocolos" ON protocolos;

-- Remover políticas RESTRICTIVE existentes da tabela motoristas
DROP POLICY IF EXISTS "Permitir inserção de motoristas" ON motoristas;
DROP POLICY IF EXISTS "Permitir leitura de motoristas" ON motoristas;
DROP POLICY IF EXISTS "Permitir atualização de motoristas" ON motoristas;
DROP POLICY IF EXISTS "Permitir deleção de motoristas" ON motoristas;

-- Remover políticas RESTRICTIVE existentes da tabela unidades
DROP POLICY IF EXISTS "Permitir inserção de unidades" ON unidades;
DROP POLICY IF EXISTS "Permitir leitura de unidades" ON unidades;
DROP POLICY IF EXISTS "Permitir atualização de unidades" ON unidades;
DROP POLICY IF EXISTS "Permitir deleção de unidades" ON unidades;

-- Remover políticas RESTRICTIVE existentes da tabela produtos
DROP POLICY IF EXISTS "Permitir inserção de produtos" ON produtos;
DROP POLICY IF EXISTS "Permitir leitura de produtos" ON produtos;
DROP POLICY IF EXISTS "Permitir atualização de produtos" ON produtos;

-- Remover políticas RESTRICTIVE existentes da tabela pdvs
DROP POLICY IF EXISTS "Permitir leitura de PDVs" ON pdvs;

-- Criar políticas PERMISSIVE para protocolos
CREATE POLICY "Acesso público inserção protocolos" ON protocolos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Acesso público leitura protocolos" ON protocolos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Acesso público atualização protocolos" ON protocolos FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Acesso público deleção protocolos" ON protocolos FOR DELETE TO anon, authenticated USING (true);

-- Criar políticas PERMISSIVE para motoristas
CREATE POLICY "Acesso público inserção motoristas" ON motoristas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Acesso público leitura motoristas" ON motoristas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Acesso público atualização motoristas" ON motoristas FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Acesso público deleção motoristas" ON motoristas FOR DELETE TO anon, authenticated USING (true);

-- Criar políticas PERMISSIVE para unidades
CREATE POLICY "Acesso público inserção unidades" ON unidades FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Acesso público leitura unidades" ON unidades FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Acesso público atualização unidades" ON unidades FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Acesso público deleção unidades" ON unidades FOR DELETE TO anon, authenticated USING (true);

-- Criar políticas PERMISSIVE para produtos
CREATE POLICY "Acesso público inserção produtos" ON produtos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Acesso público leitura produtos" ON produtos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Acesso público atualização produtos" ON produtos FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Acesso público deleção produtos" ON produtos FOR DELETE TO anon, authenticated USING (true);

-- Criar políticas PERMISSIVE para pdvs
CREATE POLICY "Acesso público inserção pdvs" ON pdvs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Acesso público leitura pdvs" ON pdvs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Acesso público atualização pdvs" ON pdvs FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Acesso público deleção pdvs" ON pdvs FOR DELETE TO anon, authenticated USING (true);