import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface AuditLogEntry {
  acao: string;
  tabela: string;
  registro_id: string;
  registro_dados?: Json;
  usuario_nome: string;
  usuario_role?: string;
  usuario_unidade?: string;
}

export const useAuditLog = () => {
  const registrarLog = async (entry: AuditLogEntry) => {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert([{
          acao: entry.acao,
          tabela: entry.tabela,
          registro_id: entry.registro_id,
          registro_dados: entry.registro_dados || null,
          usuario_nome: entry.usuario_nome,
          usuario_role: entry.usuario_role || null,
          usuario_unidade: entry.usuario_unidade || null,
        }]);

      if (error) {
        console.error('Erro ao registrar log de auditoria:', error);
      }
    } catch (err) {
      console.error('Erro ao registrar log de auditoria:', err);
    }
  };

  return { registrarLog };
};
