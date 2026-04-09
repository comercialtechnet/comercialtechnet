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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      importacoes: {
        Row: {
          data_importacao: string
          id: string
          importado_por: string
          nome_arquivo: string
          total_erros: number
          total_inseridas: number
          total_linhas: number
          total_substituidas: number
        }
        Insert: {
          data_importacao?: string
          id?: string
          importado_por: string
          nome_arquivo: string
          total_erros?: number
          total_inseridas?: number
          total_linhas?: number
          total_substituidas?: number
        }
        Update: {
          data_importacao?: string
          id?: string
          importado_por?: string
          nome_arquivo?: string
          total_erros?: number
          total_inseridas?: number
          total_linhas?: number
          total_substituidas?: number
        }
        Relationships: []
      }
      itens_venda: {
        Row: {
          categoria_principal: string | null
          criado_em: string
          descricao_normalizada: string | null
          descricao_original: string | null
          flags_json: Json
          grupo_combo: string | null
          id: string
          ordem_item: number
          subcategoria: string | null
          valor_item: number
          venda_id: string
        }
        Insert: {
          categoria_principal?: string | null
          criado_em?: string
          descricao_normalizada?: string | null
          descricao_original?: string | null
          flags_json?: Json
          grupo_combo?: string | null
          id?: string
          ordem_item?: number
          subcategoria?: string | null
          valor_item?: number
          venda_id: string
        }
        Update: {
          categoria_principal?: string | null
          criado_em?: string
          descricao_normalizada?: string | null
          descricao_original?: string | null
          flags_json?: Json
          grupo_combo?: string | null
          id?: string
          ordem_item?: number
          subcategoria?: string | null
          valor_item?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_mensais: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          meta_faturamento: number
          meta_total_vendas: number
          meta_vendas_virtua: number
          periodo_ano: number
          periodo_mes: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          meta_faturamento?: number
          meta_total_vendas?: number
          meta_vendas_virtua?: number
          periodo_ano: number
          periodo_mes: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          meta_faturamento?: number
          meta_total_vendas?: number
          meta_vendas_virtua?: number
          periodo_ano?: number
          periodo_mes?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          ativo: boolean
          criado_em: string
          id: string
          nome_normalizado: string
          nome_vinculado: string
          perfil: Database["public"]["Enums"]["app_role"]
          status_aprovacao: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean
          criado_em?: string
          id: string
          nome_normalizado: string
          nome_vinculado: string
          perfil?: Database["public"]["Enums"]["app_role"]
          status_aprovacao?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean
          criado_em?: string
          id?: string
          nome_normalizado?: string
          nome_vinculado?: string
          perfil?: Database["public"]["Enums"]["app_role"]
          status_aprovacao?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          chave_deduplicacao: string | null
          cliente: string | null
          com_tv_original: string | null
          combo_tipo: string | null
          contrato: string | null
          criado_em: string
          data_instalacao: string | null
          e_combo: boolean
          forma_pagamento: string | null
          id: string
          id_cliente: string | null
          id_venda: string
          id_vendedor: string | null
          importacao_id: string
          possui_adicionais: boolean
          possui_internet: boolean
          possui_mesh: boolean
          possui_movel: boolean
          possui_mudanca_tecnologia: boolean
          possui_ponto_extra: boolean
          possui_telefone: boolean
          possui_tv: boolean
          produtos_brutos: string | null
          proposta: string | null
          quantidade_itens: number
          supervisor: string | null
          supervisor_normalizado: string | null
          tipo_cliente: string | null
          tipo_pacote: string | null
          tipo_venda: string | null
          valor_total: number
          vendedor: string | null
          vendedor_normalizado: string | null
        }
        Insert: {
          chave_deduplicacao?: string | null
          cliente?: string | null
          com_tv_original?: string | null
          combo_tipo?: string | null
          contrato?: string | null
          criado_em?: string
          data_instalacao?: string | null
          e_combo?: boolean
          forma_pagamento?: string | null
          id?: string
          id_cliente?: string | null
          id_venda: string
          id_vendedor?: string | null
          importacao_id: string
          possui_adicionais?: boolean
          possui_internet?: boolean
          possui_mesh?: boolean
          possui_movel?: boolean
          possui_mudanca_tecnologia?: boolean
          possui_ponto_extra?: boolean
          possui_telefone?: boolean
          possui_tv?: boolean
          produtos_brutos?: string | null
          proposta?: string | null
          quantidade_itens?: number
          supervisor?: string | null
          supervisor_normalizado?: string | null
          tipo_cliente?: string | null
          tipo_pacote?: string | null
          tipo_venda?: string | null
          valor_total?: number
          vendedor?: string | null
          vendedor_normalizado?: string | null
        }
        Update: {
          chave_deduplicacao?: string | null
          cliente?: string | null
          com_tv_original?: string | null
          combo_tipo?: string | null
          contrato?: string | null
          criado_em?: string
          data_instalacao?: string | null
          e_combo?: boolean
          forma_pagamento?: string | null
          id?: string
          id_cliente?: string | null
          id_venda?: string
          id_vendedor?: string | null
          importacao_id?: string
          possui_adicionais?: boolean
          possui_internet?: boolean
          possui_mesh?: boolean
          possui_movel?: boolean
          possui_mudanca_tecnologia?: boolean
          possui_ponto_extra?: boolean
          possui_telefone?: boolean
          possui_tv?: boolean
          produtos_brutos?: string | null
          proposta?: string | null
          quantidade_itens?: number
          supervisor?: string | null
          supervisor_normalizado?: string | null
          tipo_cliente?: string | null
          tipo_pacote?: string | null
          tipo_venda?: string | null
          valor_total?: number
          vendedor?: string | null
          vendedor_normalizado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "administrador" | "supervisor" | "vendedor" | "consultor"
      approval_status: "pendente" | "aprovado" | "rejeitado"
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
    Enums: {
      app_role: ["administrador", "supervisor", "vendedor", "consultor"],
      approval_status: ["pendente", "aprovado", "rejeitado"],
    },
  },
} as const
