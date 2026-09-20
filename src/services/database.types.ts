export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      baseline_profiles: {
        Row: {
          ac_hours_per_day: number
          created_at: string
          effective_from: string
          factors_version: string
          fan_hours_per_day: number
          household_size: number
          id: string
          laptop_hours_per_day: number
          laundry_loads_per_week: number
          laundry_machine: string
          shower_heater: string
          shower_minutes_per_day: number
          user_id: string
        }
        Insert: {
          ac_hours_per_day: number
          created_at?: string
          effective_from?: string
          factors_version: string
          fan_hours_per_day: number
          household_size: number
          id?: string
          laptop_hours_per_day: number
          laundry_loads_per_week: number
          laundry_machine: string
          shower_heater: string
          shower_minutes_per_day: number
          user_id: string
        }
        Update: {
          ac_hours_per_day?: number
          created_at?: string
          effective_from?: string
          factors_version?: string
          fan_hours_per_day?: number
          household_size?: number
          id?: string
          laptop_hours_per_day?: number
          laundry_loads_per_week?: number
          laundry_machine?: string
          shower_heater?: string
          shower_minutes_per_day?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baseline_profiles_factors_version_fkey"
            columns: ["factors_version"]
            isOneToOne: false
            referencedRelation: "factor_sets"
            referencedColumns: ["version"]
          },
        ]
      }
      deviations: {
        Row: {
          created_at: string
          end_date: string
          field: string
          group_id: string | null
          id: string
          mode: string
          note: string | null
          start_date: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          end_date: string
          field: string
          group_id?: string | null
          id?: string
          mode: string
          note?: string | null
          start_date: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          end_date?: string
          field?: string
          group_id?: string | null
          id?: string
          mode?: string
          note?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      factor_sets: {
        Row: {
          created_at: string
          effective_from: string
          payload: Json
          region: string
          version: string
        }
        Insert: {
          created_at?: string
          effective_from: string
          payload: Json
          region: string
          version: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          payload?: Json
          region?: string
          version?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          id: string
          period: string
          reference_profile: Json
          resource: string
          start_date: string
          status: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period: string
          reference_profile: Json
          resource: string
          start_date: string
          status?: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period?: string
          reference_profile?: Json
          resource?: string
          start_date?: string
          status?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_contributions: {
        Row: {
          created_at: string
          day: string
          energy_saved_kwh: number
          team_id: string
          updated_at: string
          user_id: string
          water_saved_l: number
        }
        Insert: {
          created_at?: string
          day: string
          energy_saved_kwh: number
          team_id: string
          updated_at?: string
          user_id: string
          water_saved_l: number
        }
        Update: {
          created_at?: string
          day?: string
          energy_saved_kwh?: number
          team_id?: string
          updated_at?: string
          user_id?: string
          water_saved_l?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_contributions_team_id_user_id_fkey"
            columns: ["team_id", "user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
        ]
      }
      team_members: {
        Row: {
          alias: string
          baseline_energy_kwh_day: number
          baseline_water_l_day: number
          created_at: string
          joined_at: string
          member_id: string
          reference_profile: Json
          role: string
          sharing: boolean
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alias: string
          baseline_energy_kwh_day: number
          baseline_water_l_day: number
          created_at?: string
          joined_at?: string
          member_id?: string
          reference_profile: Json
          role: string
          sharing?: boolean
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alias?: string
          baseline_energy_kwh_day?: number
          baseline_water_l_day?: number
          created_at?: string
          joined_at?: string
          member_id?: string
          reference_profile?: Json
          role?: string
          sharing?: boolean
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          join_code: string
          name: string
          owner_id: string
          show_leaderboard: boolean
          target_amount: number | null
          target_resource: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          join_code: string
          name: string
          owner_id: string
          show_leaderboard?: boolean
          target_amount?: number | null
          target_resource?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          join_code?: string
          name?: string
          owner_id?: string
          show_leaderboard?: boolean
          target_amount?: number | null
          target_resource?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_team: {
        Args: {
          p_alias: string
          p_baseline_energy_kwh_day: number
          p_baseline_water_l_day: number
          p_name: string
          p_reference_profile: Json
          p_target_amount?: number
          p_target_resource?: string
        }
        Returns: Json
      }
      delete_team: { Args: { p_team_id: string }; Returns: undefined }
      get_leaderboard: { Args: { p_team_id: string }; Returns: Json }
      get_my_teams: { Args: never; Returns: Json }
      get_team_members: { Args: { p_team_id: string }; Returns: Json }
      get_team_summary: { Args: { p_team_id: string }; Returns: Json }
      internal_generate_join_code: { Args: never; Returns: string }
      is_group_accessible_to_user: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      join_team: {
        Args: {
          p_alias: string
          p_baseline_energy_kwh_day: number
          p_baseline_water_l_day: number
          p_code: string
          p_reference_profile: Json
        }
        Returns: Json
      }
      leave_team: { Args: { p_team_id: string }; Returns: undefined }
      remove_member: {
        Args: { p_member_id: string; p_team_id: string }
        Returns: undefined
      }
      rotate_code: { Args: { p_team_id: string }; Returns: string }
      update_my_membership: {
        Args: { p_alias: string; p_sharing: boolean; p_team_id: string }
        Returns: undefined
      }
      update_team_settings: {
        Args: {
          p_show_leaderboard: boolean
          p_target_amount: number
          p_target_resource: string
          p_team_id: string
        }
        Returns: undefined
      }
      upsert_my_contributions: {
        Args: { p_rows: Json; p_team_id: string }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

