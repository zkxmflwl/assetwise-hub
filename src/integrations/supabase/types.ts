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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asset_types: {
        Row: {
          asset_type_code: string
          created_at: string
          is_active: boolean
          major_category: string
          sort_order: number
          sub_category: string
          updated_at: string
        }
        Insert: {
          asset_type_code: string
          created_at?: string
          is_active?: boolean
          major_category: string
          sort_order?: number
          sub_category: string
          updated_at?: string
        }
        Update: {
          asset_type_code?: string
          created_at?: string
          is_active?: boolean
          major_category?: string
          sort_order?: number
          sub_category?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_projects: {
        Row: {
          client_name: string | null
          department_code: string
          end_date: string | null
          id: number
          last_modified_by_auth_user_id: string | null
          net_sales_amount: number | null
          note: string | null
          order_date: string | null
          project_name: string
          project_status: string
          purchase_amount: number | null
          sales_amount: number | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          department_code: string
          end_date?: string | null
          id?: never
          last_modified_by_auth_user_id?: string | null
          net_sales_amount?: number | null
          note?: string | null
          order_date?: string | null
          project_name: string
          project_status: string
          purchase_amount?: number | null
          sales_amount?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          department_code?: string
          end_date?: string | null
          id?: never
          last_modified_by_auth_user_id?: string | null
          net_sales_amount?: number | null
          note?: string | null
          order_date?: string | null
          project_name?: string
          project_status?: string
          purchase_amount?: number | null
          sales_amount?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_projects_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["department_code"]
          },
          {
            foreignKeyName: "business_projects_last_modified_by_auth_user_id_fkey"
            columns: ["last_modified_by_auth_user_id"]
            isOneToOne: false
            referencedRelation: "dash_users"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      dash_users: {
        Row: {
          auth_user_id: string
          created_at: string
          department_code: string | null
          is_active: boolean
          must_change_password: boolean
          role_code: string
          updated_at: string
          user_email: string
          user_name: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          department_code?: string | null
          is_active?: boolean
          must_change_password?: boolean
          role_code?: string
          updated_at?: string
          user_email: string
          user_name: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          department_code?: string | null
          is_active?: boolean
          must_change_password?: boolean
          role_code?: string
          updated_at?: string
          user_email?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "dash_users_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["department_code"]
          },
        ]
      }
      department_sales_summary: {
        Row: {
          department_code: string
          id: number
          last_modified_by_auth_user_id: string | null
          month_key: string
          net_sales_amount: number
          note: string | null
          purchase_amount: number
          sales_amount: number
          total_headcount: number
          updated_at: string
        }
        Insert: {
          department_code: string
          id?: never
          last_modified_by_auth_user_id?: string | null
          month_key: string
          net_sales_amount?: number
          note?: string | null
          purchase_amount?: number
          sales_amount?: number
          total_headcount?: number
          updated_at?: string
        }
        Update: {
          department_code?: string
          id?: never
          last_modified_by_auth_user_id?: string | null
          month_key?: string
          net_sales_amount?: number
          note?: string | null
          purchase_amount?: number
          sales_amount?: number
          total_headcount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_sales_summary_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["department_code"]
          },
          {
            foreignKeyName: "department_sales_summary_last_modified_by_auth_user_id_fkey"
            columns: ["last_modified_by_auth_user_id"]
            isOneToOne: false
            referencedRelation: "dash_users"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          department_code: string
          department_name: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_code: string
          department_name: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_code?: string
          department_name?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      intangible_assets: {
        Row: {
          asset_type_code: string | null
          department_code: string | null
          expiry_date: string | null
          id: number
          last_modified_by_auth_user_id: string | null
          license_name: string
          note: string | null
          quantity: number
          start_date: string | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          asset_type_code?: string | null
          department_code?: string | null
          expiry_date?: string | null
          id?: never
          last_modified_by_auth_user_id?: string | null
          license_name: string
          note?: string | null
          quantity?: number
          start_date?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          asset_type_code?: string | null
          department_code?: string | null
          expiry_date?: string | null
          id?: never
          last_modified_by_auth_user_id?: string | null
          license_name?: string
          note?: string | null
          quantity?: number
          start_date?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intangible_assets_asset_type_code_fkey"
            columns: ["asset_type_code"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["asset_type_code"]
          },
          {
            foreignKeyName: "intangible_assets_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["department_code"]
          },
          {
            foreignKeyName: "intangible_assets_last_modified_by_auth_user_id_fkey"
            columns: ["last_modified_by_auth_user_id"]
            isOneToOne: false
            referencedRelation: "dash_users"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      tangible_assets: {
        Row: {
          asset_no: string | null
          asset_type_code: string | null
          cpu_spec: string | null
          department_code: string | null
          hdd_spec: string | null
          id: number
          issued_date: string | null
          last_modified_by_auth_user_id: string | null
          manufacturer: string | null
          mem_spec: string | null
          model_name: string | null
          note: string | null
          os_name: string | null
          purchase_date: string | null
          purpose: string | null
          screen_size: string | null
          serial_no: string | null
          ssd_spec: string | null
          updated_at: string
          usage_location: string | null
        }
        Insert: {
          asset_no?: string | null
          asset_type_code?: string | null
          cpu_spec?: string | null
          department_code?: string | null
          hdd_spec?: string | null
          id?: never
          issued_date?: string | null
          last_modified_by_auth_user_id?: string | null
          manufacturer?: string | null
          mem_spec?: string | null
          model_name?: string | null
          note?: string | null
          os_name?: string | null
          purchase_date?: string | null
          purpose?: string | null
          screen_size?: string | null
          serial_no?: string | null
          ssd_spec?: string | null
          updated_at?: string
          usage_location?: string | null
        }
        Update: {
          asset_no?: string | null
          asset_type_code?: string | null
          cpu_spec?: string | null
          department_code?: string | null
          hdd_spec?: string | null
          id?: never
          issued_date?: string | null
          last_modified_by_auth_user_id?: string | null
          manufacturer?: string | null
          mem_spec?: string | null
          model_name?: string | null
          note?: string | null
          os_name?: string | null
          purchase_date?: string | null
          purpose?: string | null
          screen_size?: string | null
          serial_no?: string | null
          ssd_spec?: string | null
          updated_at?: string
          usage_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tangible_assets_asset_type_code_fkey"
            columns: ["asset_type_code"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["asset_type_code"]
          },
          {
            foreignKeyName: "tangible_assets_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["department_code"]
          },
          {
            foreignKeyName: "tangible_assets_last_modified_by_auth_user_id_fkey"
            columns: ["last_modified_by_auth_user_id"]
            isOneToOne: false
            referencedRelation: "dash_users"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
