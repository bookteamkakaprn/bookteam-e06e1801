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
      certificados: {
        Row: {
          assinatura: string | null
          carga_horaria: number
          created_at: string
          data_emissao: string
          evento_id: string
          id: string
          livro_id: string | null
          participante_id: string
          pdf_url: string | null
        }
        Insert: {
          assinatura?: string | null
          carga_horaria?: number
          created_at?: string
          data_emissao?: string
          evento_id: string
          id?: string
          livro_id?: string | null
          participante_id: string
          pdf_url?: string | null
        }
        Update: {
          assinatura?: string | null
          carga_horaria?: number
          created_at?: string
          data_emissao?: string
          evento_id?: string
          id?: string
          livro_id?: string | null
          participante_id?: string
          pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_livro_id_fkey"
            columns: ["livro_id"]
            isOneToOne: false
            referencedRelation: "livros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_pagamento: {
        Row: {
          banco: string | null
          beneficiario: string | null
          created_at: string
          id: string
          instrucoes: string | null
          pix_chave: string | null
          pix_copia_cola: string | null
          pix_qrcode_url: string | null
          tipo_chave: string | null
          updated_at: string
        }
        Insert: {
          banco?: string | null
          beneficiario?: string | null
          created_at?: string
          id?: string
          instrucoes?: string | null
          pix_chave?: string | null
          pix_copia_cola?: string | null
          pix_qrcode_url?: string | null
          tipo_chave?: string | null
          updated_at?: string
        }
        Update: {
          banco?: string | null
          beneficiario?: string | null
          created_at?: string
          id?: string
          instrucoes?: string | null
          pix_chave?: string | null
          pix_copia_cola?: string | null
          pix_qrcode_url?: string | null
          tipo_chave?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          cidade: string | null
          created_at: string
          data: string
          descricao: string | null
          hora: string | null
          id: string
          imagem_url: string | null
          livro_id: string | null
          local: string | null
          pix_chave: string | null
          pix_copia_cola: string | null
          pix_qrcode_url: string | null
          status: Database["public"]["Enums"]["evento_status"]
          titulo: string
          updated_at: string
          vagas: number
          valor: number
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          hora?: string | null
          id?: string
          imagem_url?: string | null
          livro_id?: string | null
          local?: string | null
          pix_chave?: string | null
          pix_copia_cola?: string | null
          pix_qrcode_url?: string | null
          status?: Database["public"]["Enums"]["evento_status"]
          titulo: string
          updated_at?: string
          vagas?: number
          valor?: number
        }
        Update: {
          cidade?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          hora?: string | null
          id?: string
          imagem_url?: string | null
          livro_id?: string | null
          local?: string | null
          pix_chave?: string | null
          pix_copia_cola?: string | null
          pix_qrcode_url?: string | null
          status?: Database["public"]["Enums"]["evento_status"]
          titulo?: string
          updated_at?: string
          vagas?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "eventos_livro_id_fkey"
            columns: ["livro_id"]
            isOneToOne: false
            referencedRelation: "livros"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricoes: {
        Row: {
          codigo: string | null
          created_at: string
          evento_id: string | null
          id: string
          participante_id: string
          status: Database["public"]["Enums"]["inscricao_status"]
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          evento_id?: string | null
          id?: string
          participante_id: string
          status?: Database["public"]["Enums"]["inscricao_status"]
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          evento_id?: string | null
          id?: string
          participante_id?: string
          status?: Database["public"]["Enums"]["inscricao_status"]
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      livros: {
        Row: {
          ano: number | null
          autor: string | null
          categoria: string | null
          competencias: string | null
          conteudo_programatico: string | null
          coordenador: string | null
          created_at: string
          datas_curso: string | null
          descricao: string | null
          duracao: string | null
          horario: string | null
          id: string
          imagem_url: string | null
          inscritos: number
          material_necessario: string | null
          objetivo: string | null
          ordem: number
          professor: string | null
          publico_alvo: string | null
          qtd_encontros: number | null
          sala: string | null
          status: Database["public"]["Enums"]["livro_status"]
          titulo: string
          trilha_id: string
          turma: string | null
          updated_at: string
          vagas_restantes: number | null
          vagas_total: number
          valor: number | null
        }
        Insert: {
          ano?: number | null
          autor?: string | null
          categoria?: string | null
          competencias?: string | null
          conteudo_programatico?: string | null
          coordenador?: string | null
          created_at?: string
          datas_curso?: string | null
          descricao?: string | null
          duracao?: string | null
          horario?: string | null
          id?: string
          imagem_url?: string | null
          inscritos?: number
          material_necessario?: string | null
          objetivo?: string | null
          ordem?: number
          professor?: string | null
          publico_alvo?: string | null
          qtd_encontros?: number | null
          sala?: string | null
          status?: Database["public"]["Enums"]["livro_status"]
          titulo: string
          trilha_id: string
          turma?: string | null
          updated_at?: string
          vagas_restantes?: number | null
          vagas_total?: number
          valor?: number | null
        }
        Update: {
          ano?: number | null
          autor?: string | null
          categoria?: string | null
          competencias?: string | null
          conteudo_programatico?: string | null
          coordenador?: string | null
          created_at?: string
          datas_curso?: string | null
          descricao?: string | null
          duracao?: string | null
          horario?: string | null
          id?: string
          imagem_url?: string | null
          inscritos?: number
          material_necessario?: string | null
          objetivo?: string | null
          ordem?: number
          professor?: string | null
          publico_alvo?: string | null
          qtd_encontros?: number | null
          sala?: string | null
          status?: Database["public"]["Enums"]["livro_status"]
          titulo?: string
          trilha_id?: string
          turma?: string | null
          updated_at?: string
          vagas_restantes?: number | null
          vagas_total?: number
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "livros_trilha_id_fkey"
            columns: ["trilha_id"]
            isOneToOne: false
            referencedRelation: "trilhas"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais: {
        Row: {
          created_at: string
          id: string
          livro_id: string
          tipo: Database["public"]["Enums"]["material_tipo"]
          titulo: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          livro_id: string
          tipo: Database["public"]["Enums"]["material_tipo"]
          titulo: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          livro_id?: string
          tipo?: Database["public"]["Enums"]["material_tipo"]
          titulo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiais_livro_id_fkey"
            columns: ["livro_id"]
            isOneToOne: false
            referencedRelation: "livros"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          assunto: string | null
          canal: string
          created_at: string
          enviada: boolean
          enviada_em: string | null
          id: string
          mensagem: string
          participante_id: string
        }
        Insert: {
          assunto?: string | null
          canal: string
          created_at?: string
          enviada?: boolean
          enviada_em?: string | null
          id?: string
          mensagem: string
          participante_id: string
        }
        Update: {
          assunto?: string | null
          canal?: string
          created_at?: string
          enviada?: boolean
          enviada_em?: string | null
          id?: string
          mensagem?: string
          participante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      observacoes: {
        Row: {
          autor_id: string
          created_at: string
          id: string
          participante_id: string
          texto: string
        }
        Insert: {
          autor_id: string
          created_at?: string
          id?: string
          participante_id: string
          texto: string
        }
        Update: {
          autor_id?: string
          created_at?: string
          id?: string
          participante_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "observacoes_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          comprovante_url: string | null
          created_at: string
          evento_id: string | null
          id: string
          inscricao_id: string
          observacao: string | null
          participante_id: string
          status: Database["public"]["Enums"]["pagamento_status"]
          turma_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          comprovante_url?: string | null
          created_at?: string
          evento_id?: string | null
          id?: string
          inscricao_id: string
          observacao?: string | null
          participante_id: string
          status?: Database["public"]["Enums"]["pagamento_status"]
          turma_id?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          comprovante_url?: string | null
          created_at?: string
          evento_id?: string | null
          id?: string
          inscricao_id?: string
          observacao?: string | null
          participante_id?: string
          status?: Database["public"]["Enums"]["pagamento_status"]
          turma_id?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      participantes: {
        Row: {
          aceite_lgpd: boolean
          cidade: string | null
          como_conheceu: string | null
          cpf: string | null
          created_at: string
          email: string
          estado: string | null
          foto_url: string | null
          id: string
          igreja: string | null
          nascimento: string | null
          nome: string
          observacoes_admin: string | null
          status: Database["public"]["Enums"]["participante_crm_status"]
          telefone: string | null
          ultimo_acesso: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          aceite_lgpd?: boolean
          cidade?: string | null
          como_conheceu?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          estado?: string | null
          foto_url?: string | null
          id: string
          igreja?: string | null
          nascimento?: string | null
          nome: string
          observacoes_admin?: string | null
          status?: Database["public"]["Enums"]["participante_crm_status"]
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          aceite_lgpd?: boolean
          cidade?: string | null
          como_conheceu?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          estado?: string | null
          foto_url?: string | null
          id?: string
          igreja?: string | null
          nascimento?: string | null
          nome?: string
          observacoes_admin?: string | null
          status?: Database["public"]["Enums"]["participante_crm_status"]
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      presencas: {
        Row: {
          created_at: string
          evento_id: string
          horario_checkin: string | null
          id: string
          inscricao_id: string
          participante_id: string
          presente: boolean
          registrado_por: string | null
        }
        Insert: {
          created_at?: string
          evento_id: string
          horario_checkin?: string | null
          id?: string
          inscricao_id: string
          participante_id: string
          presente?: boolean
          registrado_por?: string | null
        }
        Update: {
          created_at?: string
          evento_id?: string
          horario_checkin?: string | null
          id?: string
          inscricao_id?: string
          participante_id?: string
          presente?: boolean
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presencas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: true
            referencedRelation: "inscricoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      trilhas: {
        Row: {
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          imagem_url: string | null
          nome: string
          status: Database["public"]["Enums"]["trilha_status"]
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          status?: Database["public"]["Enums"]["trilha_status"]
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          status?: Database["public"]["Enums"]["trilha_status"]
          updated_at?: string
        }
        Relationships: []
      }
      turmas: {
        Row: {
          ano: number | null
          coordenador: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          horario: string | null
          id: string
          inscritos: number
          livro_id: string
          nome: string
          professor: string | null
          sala: string | null
          staff: string | null
          status: string
          temporada: string | null
          updated_at: string
          vagas_max: number
          vagas_restantes: number | null
          valor: number | null
        }
        Insert: {
          ano?: number | null
          coordenador?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          horario?: string | null
          id?: string
          inscritos?: number
          livro_id: string
          nome: string
          professor?: string | null
          sala?: string | null
          staff?: string | null
          status?: string
          temporada?: string | null
          updated_at?: string
          vagas_max?: number
          vagas_restantes?: number | null
          valor?: number | null
        }
        Update: {
          ano?: number | null
          coordenador?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          horario?: string | null
          id?: string
          inscritos?: number
          livro_id?: string
          nome?: string
          professor?: string | null
          sala?: string | null
          staff?: string | null
          status?: string
          temporada?: string | null
          updated_at?: string
          vagas_max?: number
          vagas_restantes?: number | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "turmas_livro_id_fkey"
            columns: ["livro_id"]
            isOneToOne: false
            referencedRelation: "livros"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "participante"
      evento_status: "aberto" | "fechado" | "cancelado" | "realizado"
      inscricao_status:
        | "aguardando_pagamento"
        | "confirmada"
        | "cancelada"
        | "lista_espera"
      livro_status: "ativo" | "arquivado"
      material_tipo: "pdf" | "video" | "link"
      pagamento_status: "aguardando" | "aprovado" | "rejeitado"
      participante_crm_status:
        | "lead"
        | "inscrito"
        | "pago"
        | "participando"
        | "concluido"
        | "inativo"
      trilha_status: "ativa" | "arquivada"
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
      app_role: ["admin", "participante"],
      evento_status: ["aberto", "fechado", "cancelado", "realizado"],
      inscricao_status: [
        "aguardando_pagamento",
        "confirmada",
        "cancelada",
        "lista_espera",
      ],
      livro_status: ["ativo", "arquivado"],
      material_tipo: ["pdf", "video", "link"],
      pagamento_status: ["aguardando", "aprovado", "rejeitado"],
      participante_crm_status: [
        "lead",
        "inscrito",
        "pago",
        "participando",
        "concluido",
        "inativo",
      ],
      trilha_status: ["ativa", "arquivada"],
    },
  },
} as const
