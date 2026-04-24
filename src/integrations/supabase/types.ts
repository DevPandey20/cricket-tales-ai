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
      ball_by_ball: {
        Row: {
          batter: string
          batter_team: string
          bowler: string
          bowler_team: string
          created_at: string
          dismissal_kind: string | null
          id: string
          innings: number
          is_wicket: boolean
          match_date: string
          match_id: string
          non_striker: string | null
          over_num: number
          player_out: string | null
          runs_batter: number
          runs_extras: number
          runs_total: number
          season: string
          venue: string
        }
        Insert: {
          batter: string
          batter_team: string
          bowler: string
          bowler_team: string
          created_at?: string
          dismissal_kind?: string | null
          id?: string
          innings: number
          is_wicket?: boolean
          match_date: string
          match_id: string
          non_striker?: string | null
          over_num: number
          player_out?: string | null
          runs_batter?: number
          runs_extras?: number
          runs_total?: number
          season: string
          venue: string
        }
        Update: {
          batter?: string
          batter_team?: string
          bowler?: string
          bowler_team?: string
          created_at?: string
          dismissal_kind?: string | null
          id?: string
          innings?: number
          is_wicket?: boolean
          match_date?: string
          match_id?: string
          non_striker?: string | null
          over_num?: number
          player_out?: string | null
          runs_batter?: number
          runs_extras?: number
          runs_total?: number
          season?: string
          venue?: string
        }
        Relationships: []
      }
      player_match_stats: {
        Row: {
          balls: number
          city: string
          created_at: string
          economy: number | null
          id: string
          match_date: string
          match_id: string
          opponent: string
          overs_bowled: number
          own_team: string
          player_name: string
          runs: number
          runs_conceded: number
          season: string
          venue: string
          wickets: number
        }
        Insert: {
          balls?: number
          city?: string
          created_at?: string
          economy?: number | null
          id?: string
          match_date: string
          match_id: string
          opponent: string
          overs_bowled?: number
          own_team: string
          player_name: string
          runs?: number
          runs_conceded?: number
          season: string
          venue: string
          wickets?: number
        }
        Update: {
          balls?: number
          city?: string
          created_at?: string
          economy?: number | null
          id?: string
          match_date?: string
          match_id?: string
          opponent?: string
          overs_bowled?: number
          own_team?: string
          player_name?: string
          runs?: number
          runs_conceded?: number
          season?: string
          venue?: string
          wickets?: number
        }
        Relationships: []
      }
      predictions: {
        Row: {
          actual_player_runs: number | null
          actual_player_wickets: number | null
          actual_winner: string | null
          confidence: number
          created_at: string
          graded_at: string | null
          id: string
          match_date: string | null
          player_name: string | null
          predicted_player_runs: number | null
          predicted_player_wickets: number | null
          predicted_winner: string
          runs_error: number | null
          team1: string
          team2: string
          venue: string
          wickets_error: number | null
          win_probability: number
          winner_correct: boolean | null
        }
        Insert: {
          actual_player_runs?: number | null
          actual_player_wickets?: number | null
          actual_winner?: string | null
          confidence: number
          created_at?: string
          graded_at?: string | null
          id?: string
          match_date?: string | null
          player_name?: string | null
          predicted_player_runs?: number | null
          predicted_player_wickets?: number | null
          predicted_winner: string
          runs_error?: number | null
          team1: string
          team2: string
          venue: string
          wickets_error?: number | null
          win_probability: number
          winner_correct?: boolean | null
        }
        Update: {
          actual_player_runs?: number | null
          actual_player_wickets?: number | null
          actual_winner?: string | null
          confidence?: number
          created_at?: string
          graded_at?: string | null
          id?: string
          match_date?: string | null
          player_name?: string | null
          predicted_player_runs?: number | null
          predicted_player_wickets?: number | null
          predicted_winner?: string
          runs_error?: number | null
          team1?: string
          team2?: string
          venue?: string
          wickets_error?: number | null
          win_probability?: number
          winner_correct?: boolean | null
        }
        Relationships: []
      }
      sync_state: {
        Row: {
          key: string
          last_run_at: string
          last_synced_date: string | null
          matches_synced: number
          notes: string | null
        }
        Insert: {
          key: string
          last_run_at?: string
          last_synced_date?: string | null
          matches_synced?: number
          notes?: string | null
        }
        Update: {
          key?: string
          last_run_at?: string
          last_synced_date?: string | null
          matches_synced?: number
          notes?: string | null
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
