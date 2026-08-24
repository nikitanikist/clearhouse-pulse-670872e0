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
      access_rules: {
        Row: {
          can_add_employee: boolean | null
          can_edit_employee_profile: boolean | null
          can_edit_growth: boolean | null
          can_edit_interpersonal: boolean | null
          can_edit_notes: boolean | null
          can_edit_performance: boolean | null
          can_import_data: boolean | null
          can_manage_access_rules: boolean | null
          can_manage_lookups: boolean | null
          can_manage_users: boolean | null
          created_at: string | null
          notes_scope: string
          notes_visible_position_titles: Json | null
          position: string
          updated_at: string | null
          visibility_scope: string
          visible_position_titles: Json | null
        }
        Insert: {
          can_add_employee?: boolean | null
          can_edit_employee_profile?: boolean | null
          can_edit_growth?: boolean | null
          can_edit_interpersonal?: boolean | null
          can_edit_notes?: boolean | null
          can_edit_performance?: boolean | null
          can_import_data?: boolean | null
          can_manage_access_rules?: boolean | null
          can_manage_lookups?: boolean | null
          can_manage_users?: boolean | null
          created_at?: string | null
          notes_scope: string
          notes_visible_position_titles?: Json | null
          position: string
          updated_at?: string | null
          visibility_scope: string
          visible_position_titles?: Json | null
        }
        Update: {
          can_add_employee?: boolean | null
          can_edit_employee_profile?: boolean | null
          can_edit_growth?: boolean | null
          can_edit_interpersonal?: boolean | null
          can_edit_notes?: boolean | null
          can_edit_performance?: boolean | null
          can_import_data?: boolean | null
          can_manage_access_rules?: boolean | null
          can_manage_lookups?: boolean | null
          can_manage_users?: boolean | null
          created_at?: string | null
          notes_scope?: string
          notes_visible_position_titles?: Json | null
          position?: string
          updated_at?: string | null
          visibility_scope?: string
          visible_position_titles?: Json | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      employee_core_competencies: {
        Row: {
          commentary: string
          competency_name: Database["public"]["Enums"]["core_competency"]
          employee_id: string
          id: string
          rating_code: Database["public"]["Enums"]["competency_rating"]
          updated_at: string | null
        }
        Insert: {
          commentary?: string
          competency_name: Database["public"]["Enums"]["core_competency"]
          employee_id: string
          id?: string
          rating_code: Database["public"]["Enums"]["competency_rating"]
          updated_at?: string | null
        }
        Update: {
          commentary?: string
          competency_name?: Database["public"]["Enums"]["core_competency"]
          employee_id?: string
          id?: string
          rating_code?: Database["public"]["Enums"]["competency_rating"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_core_competencies_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_dev_plan_rows: {
        Row: {
          activities: string
          employee_id: string
          id: string
          objective: string
          sort_order: number
          support_resources: string
          target_date: string | null
        }
        Insert: {
          activities?: string
          employee_id: string
          id?: string
          objective: string
          sort_order?: number
          support_resources?: string
          target_date?: string | null
        }
        Update: {
          activities?: string
          employee_id?: string
          id?: string
          objective?: string
          sort_order?: number
          support_resources?: string
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_dev_plan_rows_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_interpersonal: {
        Row: {
          assessment_text: string
          employee_id: string
          id: string
          skill_area: Database["public"]["Enums"]["interpersonal_area"]
          updated_at: string | null
        }
        Insert: {
          assessment_text?: string
          employee_id: string
          id?: string
          skill_area: Database["public"]["Enums"]["interpersonal_area"]
          updated_at?: string | null
        }
        Update: {
          assessment_text?: string
          employee_id?: string
          id?: string
          skill_area?: Database["public"]["Enums"]["interpersonal_area"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_interpersonal_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          bff_summary: string
          career_aspirations_summary: string
          created_at: string
          current_year_rating: number | null
          current_year_rating_code: Database["public"]["Enums"]["competency_rating"]
          department: string
          dev_plan_summary: string
          email: string
          growth_rationale: string
          id: string
          joining_date: string | null
          location: Database["public"]["Enums"]["employee_location"]
          name: string
          performance_summary: string
          performance_updated_at: string | null
          performance_what_could_go_better: string
          performance_what_went_well: string
          phone: string
          position: string
          potential_rating: Database["public"]["Enums"]["potential_rating"]
          role_start_date: string | null
          supervisor: string
          tenure_in_role: string
          tenure_with_firm: string
          updated_at: string
        }
        Insert: {
          bff_summary?: string
          career_aspirations_summary?: string
          created_at?: string
          current_year_rating?: number | null
          current_year_rating_code?: Database["public"]["Enums"]["competency_rating"]
          department: string
          dev_plan_summary?: string
          email: string
          growth_rationale?: string
          id?: string
          joining_date?: string | null
          location: Database["public"]["Enums"]["employee_location"]
          name: string
          performance_summary?: string
          performance_updated_at?: string | null
          performance_what_could_go_better?: string
          performance_what_went_well?: string
          phone?: string
          position: string
          potential_rating?: Database["public"]["Enums"]["potential_rating"]
          role_start_date?: string | null
          supervisor?: string
          tenure_in_role?: string
          tenure_with_firm?: string
          updated_at?: string
        }
        Update: {
          bff_summary?: string
          career_aspirations_summary?: string
          created_at?: string
          current_year_rating?: number | null
          current_year_rating_code?: Database["public"]["Enums"]["competency_rating"]
          department?: string
          dev_plan_summary?: string
          email?: string
          growth_rationale?: string
          id?: string
          joining_date?: string | null
          location?: Database["public"]["Enums"]["employee_location"]
          name?: string
          performance_summary?: string
          performance_updated_at?: string | null
          performance_what_could_go_better?: string
          performance_what_went_well?: string
          phone?: string
          position?: string
          potential_rating?: Database["public"]["Enums"]["potential_rating"]
          role_start_date?: string | null
          supervisor?: string
          tenure_in_role?: string
          tenure_with_firm?: string
          updated_at?: string
        }
        Relationships: []
      }
      management_notes: {
        Row: {
          comment_by: string
          comment_text: string
          created_at: string
          employee_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          comment_by?: string
          comment_text: string
          created_at?: string
          employee_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          comment_by?: string
          comment_text?: string
          created_at?: string
          employee_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "management_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      pdr_documents: {
        Row: {
          employee_id: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          employee_id: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          employee_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdr_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          id: string
          name: string
          visibility_tier: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          visibility_tier: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          visibility_tier?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          custom_permissions: Json | null
          full_name: string
          security_level: number
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_permissions?: Json | null
          full_name?: string
          security_level: number
          user_id: string
        }
        Update: {
          created_at?: string
          custom_permissions?: Json | null
          full_name?: string
          security_level?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_employee: { Args: { p: string }; Returns: boolean }
      can_view_employee_row: { Args: { emp_id: string }; Returns: boolean }
      can_view_notes: { Args: { emp_id: string }; Returns: boolean }
      current_security_level: { Args: never; Returns: number }
      current_user_can: { Args: { cap: string }; Returns: boolean }
      current_user_department: { Args: never; Returns: string }
      current_user_employee_id: { Args: never; Returns: string }
      current_user_location: { Args: never; Returns: string }
      current_user_name: { Args: never; Returns: string }
      current_user_position: { Args: never; Returns: string }
    }
    Enums: {
      competency_rating: "E" | "G" | "M" | "NI"
      core_competency: "Thought" | "Results" | "Expertise" | "People" | "Self"
      employee_department: "Assurance" | "Tax" | "Advisory" | "Operations"
      employee_location: "Canada" | "India"
      employee_position:
        | "Partner"
        | "Manager"
        | "Senior Associate"
        | "Intermediate"
        | "Associate"
        | "Operations"
      interpersonal_area:
        | "Client Communication"
        | "Team Collaboration"
        | "Adaptability"
        | "Problem-Solving"
        | "Initiative"
        | "Commitment to Firm Values"
        | "Dependability During Peak Seasons"
        | "Support for Team Members"
        | "Contributions to Firm Culture"
      potential_rating:
        | "Well Placed"
        | "Ready Now"
        | "Ready Soon"
        | "Ready Later"
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
      competency_rating: ["E", "G", "M", "NI"],
      core_competency: ["Thought", "Results", "Expertise", "People", "Self"],
      employee_department: ["Assurance", "Tax", "Advisory", "Operations"],
      employee_location: ["Canada", "India"],
      employee_position: [
        "Partner",
        "Manager",
        "Senior Associate",
        "Intermediate",
        "Associate",
        "Operations",
      ],
      interpersonal_area: [
        "Client Communication",
        "Team Collaboration",
        "Adaptability",
        "Problem-Solving",
        "Initiative",
        "Commitment to Firm Values",
        "Dependability During Peak Seasons",
        "Support for Team Members",
        "Contributions to Firm Culture",
      ],
      potential_rating: [
        "Well Placed",
        "Ready Now",
        "Ready Soon",
        "Ready Later",
      ],
    },
  },
} as const
