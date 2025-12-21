export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          id: string
          registro_dados: Json | null
          registro_id: string
          tabela: string
          usuario_nome: string
          usuario_role: string | null
          usuario_unidade: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          registro_dados?: Json | null
          registro_id: string
          tabela: string
          usuario_nome: string
          usuario_role?: string | null
          usuario_unidade?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          registro_dados?: Json | null
          registro_id?: string
          tabela?: string
          usuario_nome?: string
          usuario_role?: string | null
          usuario_unidade?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          nome: string | null
          tipo: string
          unidade: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome?: string | null
          tipo?: string
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string | null
          tipo?: string
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          protocolo_id: string | null
          protocolo_numero: string | null
          sender_id: string
          sender_nivel: string
          sender_nome: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          protocolo_id?: string | null
          protocolo_numero?: string | null
          sender_id: string
          sender_nivel: string
          sender_nome: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          protocolo_id?: string | null
          protocolo_numero?: string | null
          sender_id?: string
          sender_nivel?: string
          sender_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "protocolos"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string | null
          user_id: string
          user_nivel: string
          user_nome: string
          user_unidade: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          user_id: string
          user_nivel: string
          user_nome: string
          user_unidade?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          user_id?: string
          user_nivel?: string
          user_nome?: string
          user_unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      motoristas: {
        Row: {
          codigo: string
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          funcao: string
          id: string
          nome: string
          senha: string | null
          setor: string
          unidade: string
          whatsapp: string | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          funcao?: string
          id?: string
          nome: string
          senha?: string | null
          setor?: string
          unidade: string
          whatsapp?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          funcao?: string
          id?: string
          nome?: string
          senha?: string | null
          setor?: string
          unidade?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      pdvs: {
        Row: {
          bairro: string | null
          cidade: string | null
          cnpj: string | null
          codigo: string
          created_at: string | null
          endereco: string | null
          id: string
          nome: string
          unidade: string
        }
        Insert: {
          bairro?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo: string
          created_at?: string | null
          endereco?: string | null
          id?: string
          nome: string
          unidade: string
        }
        Update: {
          bairro?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo?: string
          created_at?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          unidade?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          cod: string
          created_at: string | null
          embalagem: string
          id: string
          produto: string
        }
        Insert: {
          cod: string
          created_at?: string | null
          embalagem: string
          id?: string
          produto: string
        }
        Update: {
          cod?: string
          created_at?: string | null
          embalagem?: string
          id?: string
          produto?: string
        }
        Relationships: []
      }
      protocolos: {
        Row: {
          arquivo_encerramento: string | null
          causa: string | null
          cliente_telefone: string | null
          codigo_pdv: string | null
          contato_email: string | null
          contato_whatsapp: string | null
          created_at: string | null
          data: string
          enviado_encerrar: boolean | null
          enviado_encerrar_erro: string | null
          enviado_encerrar_status: string | null
          enviado_lancar: boolean | null
          enviado_lancar_erro: string | null
          enviado_lancar_status: string | null
          fotos_protocolo: Json | null
          habilitar_reenvio: boolean | null
          hora: string
          id: string
          lancado: boolean | null
          mapa: string | null
          mensagem_encerramento: string | null
          motorista_codigo: string | null
          motorista_email: string | null
          motorista_id: string | null
          motorista_nome: string
          motorista_unidade: string | null
          motorista_whatsapp: string | null
          nota_fiscal: string | null
          numero: string
          observacao_geral: string | null
          observacoes_log: Json | null
          oculto: boolean | null
          produtos: Json | null
          status: string
          tipo_reposicao: string | null
          validacao: boolean | null
        }
        Insert: {
          arquivo_encerramento?: string | null
          causa?: string | null
          cliente_telefone?: string | null
          codigo_pdv?: string | null
          contato_email?: string | null
          contato_whatsapp?: string | null
          created_at?: string | null
          data: string
          enviado_encerrar?: boolean | null
          enviado_encerrar_erro?: string | null
          enviado_encerrar_status?: string | null
          enviado_lancar?: boolean | null
          enviado_lancar_erro?: string | null
          enviado_lancar_status?: string | null
          fotos_protocolo?: Json | null
          habilitar_reenvio?: boolean | null
          hora: string
          id?: string
          lancado?: boolean | null
          mapa?: string | null
          mensagem_encerramento?: string | null
          motorista_codigo?: string | null
          motorista_email?: string | null
          motorista_id?: string | null
          motorista_nome: string
          motorista_unidade?: string | null
          motorista_whatsapp?: string | null
          nota_fiscal?: string | null
          numero: string
          observacao_geral?: string | null
          observacoes_log?: Json | null
          oculto?: boolean | null
          produtos?: Json | null
          status?: string
          tipo_reposicao?: string | null
          validacao?: boolean | null
        }
        Update: {
          arquivo_encerramento?: string | null
          causa?: string | null
          cliente_telefone?: string | null
          codigo_pdv?: string | null
          contato_email?: string | null
          contato_whatsapp?: string | null
          created_at?: string | null
          data?: string
          enviado_encerrar?: boolean | null
          enviado_encerrar_erro?: string | null
          enviado_encerrar_status?: string | null
          enviado_lancar?: boolean | null
          enviado_lancar_erro?: string | null
          enviado_lancar_status?: string | null
          fotos_protocolo?: Json | null
          habilitar_reenvio?: boolean | null
          hora?: string
          id?: string
          lancado?: boolean | null
          mapa?: string | null
          mensagem_encerramento?: string | null
          motorista_codigo?: string | null
          motorista_email?: string | null
          motorista_id?: string | null
          motorista_nome?: string
          motorista_unidade?: string | null
          motorista_whatsapp?: string | null
          nota_fiscal?: string | null
          numero?: string
          observacao_geral?: string | null
          observacoes_log?: Json | null
          oculto?: boolean | null
          produtos?: Json | null
          status?: string
          tipo_reposicao?: string | null
          validacao?: boolean | null
        }
        Relationships: []
      }
      unidades: {
        Row: {
          cnpj: string | null
          codigo: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cnpj?: string | null
          codigo: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cnpj?: string | null
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_pdvs_por_unidade: {
        Args: never
        Returns: {
          total: number
          unidade: string
        }[]
      }
      count_protocolos_por_unidade: {
        Args: { data_fim?: string; data_inicio?: string }
        Returns: {
          total: number
          unidade: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
