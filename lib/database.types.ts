export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      cities: {
        Row: {
          country_code: string;
          created_at: string;
          id: string;
          lat: number;
          lng: number;
          name: string;
          slug: string;
          timezone: string;
        };
        Insert: {
          country_code?: string;
          created_at?: string;
          id?: string;
          lat: number;
          lng: number;
          name: string;
          slug: string;
          timezone?: string;
        };
        Update: {
          country_code?: string;
          created_at?: string;
          id?: string;
          lat?: number;
          lng?: number;
          name?: string;
          slug?: string;
          timezone?: string;
        };
        Relationships: [];
      };
      match_slots: {
        Row: {
          created_at: string;
          id: string;
          level: string;
          match_id: string;
          position: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          level?: string;
          match_id: string;
          position?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          level?: string;
          match_id?: string;
          position?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_slots_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          city_id: string;
          cost_per_person: number | null;
          created_at: string;
          currency: string;
          duration_min: number;
          format: string;
          gender_policy: string;
          host_id: string;
          id: string;
          notes: string | null;
          share_code: string;
          sport: string;
          starts_at: string;
          venue_id: string;
        };
        Insert: {
          city_id: string;
          cost_per_person?: number | null;
          created_at?: string;
          currency?: string;
          duration_min?: number;
          format?: string;
          gender_policy?: string;
          host_id: string;
          id?: string;
          notes?: string | null;
          share_code?: string;
          sport?: string;
          starts_at: string;
          venue_id: string;
        };
        Update: {
          city_id?: string;
          cost_per_person?: number | null;
          created_at?: string;
          currency?: string;
          duration_min?: number;
          format?: string;
          gender_policy?: string;
          host_id?: string;
          id?: string;
          notes?: string | null;
          share_code?: string;
          sport?: string;
          starts_at?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          city_id: string | null;
          created_at: string;
          display_name: string;
          id: string;
          level: string;
          preferred_position: string;
          preferred_sport: string;
          updated_at: string;
        };
        Insert: {
          city_id?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          level?: string;
          preferred_position?: string;
          preferred_sport?: string;
          updated_at?: string;
        };
        Update: {
          city_id?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          level?: string;
          preferred_position?: string;
          preferred_sport?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      slot_claims: {
        Row: {
          created_at: string;
          id: string;
          match_id: string;
          player_id: string;
          slot_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          match_id: string;
          player_id: string;
          slot_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          match_id?: string;
          player_id?: string;
          slot_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "slot_claims_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slot_claims_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slot_claims_slot_id_fkey";
            columns: ["slot_id"];
            isOneToOne: false;
            referencedRelation: "match_slots";
            referencedColumns: ["id"];
          },
        ];
      };
      venues: {
        Row: {
          address: string | null;
          city_id: string;
          covered: boolean | null;
          created_at: string;
          id: string;
          lat: number;
          lng: number;
          name: string;
          neighborhood: string | null;
          notes: string | null;
          slug: string;
          sports: string[];
          surface: string;
          venue_kind: string;
        };
        Insert: {
          address?: string | null;
          city_id: string;
          covered?: boolean | null;
          created_at?: string;
          id?: string;
          lat: number;
          lng: number;
          name: string;
          neighborhood?: string | null;
          notes?: string | null;
          slug: string;
          sports?: string[];
          surface?: string;
          venue_kind?: string;
        };
        Update: {
          address?: string | null;
          city_id?: string;
          covered?: boolean | null;
          created_at?: string;
          id?: string;
          lat?: number;
          lng?: number;
          name?: string;
          neighborhood?: string | null;
          notes?: string | null;
          slug?: string;
          sports?: string[];
          surface?: string;
          venue_kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venues_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_slot: { Args: { p_slot_id: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;
