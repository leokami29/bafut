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
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          meta: Json
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bm_group: {
        Row: {
          id: number
          number: number
          stage_id: number
          tournament_id: string
        }
        Insert: {
          id?: number
          number: number
          stage_id: number
          tournament_id: string
        }
        Update: {
          id?: number
          number?: number
          stage_id?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bm_group_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "bm_stage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bm_group_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      bm_match: {
        Row: {
          child_count: number
          group_id: number
          id: number
          number: number
          opponent1: Json | null
          opponent2: Json | null
          round_id: number
          stage_id: number
          status: number
          tournament_id: string
        }
        Insert: {
          child_count?: number
          group_id: number
          id?: number
          number: number
          opponent1?: Json | null
          opponent2?: Json | null
          round_id: number
          stage_id: number
          status?: number
          tournament_id: string
        }
        Update: {
          child_count?: number
          group_id?: number
          id?: number
          number?: number
          opponent1?: Json | null
          opponent2?: Json | null
          round_id?: number
          stage_id?: number
          status?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bm_match_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "bm_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bm_match_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "bm_round"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bm_match_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "bm_stage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bm_match_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      bm_match_game: {
        Row: {
          id: number
          number: number
          opponent1: Json | null
          opponent2: Json | null
          parent_id: number
          stage_id: number
          status: number
          tournament_id: string
        }
        Insert: {
          id?: number
          number: number
          opponent1?: Json | null
          opponent2?: Json | null
          parent_id: number
          stage_id: number
          status?: number
          tournament_id: string
        }
        Update: {
          id?: number
          number?: number
          opponent1?: Json | null
          opponent2?: Json | null
          parent_id?: number
          stage_id?: number
          status?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bm_match_game_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "bm_match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bm_match_game_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "bm_stage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bm_match_game_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      bm_participant: {
        Row: {
          id: number
          name: string
          tournament_id: string
        }
        Insert: {
          id?: number
          name: string
          tournament_id: string
        }
        Update: {
          id?: number
          name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bm_participant_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      bm_round: {
        Row: {
          group_id: number
          id: number
          number: number
          stage_id: number
          tournament_id: string
        }
        Insert: {
          group_id: number
          id?: number
          number: number
          stage_id: number
          tournament_id: string
        }
        Update: {
          group_id?: number
          id?: number
          number?: number
          stage_id?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bm_round_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "bm_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bm_round_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "bm_stage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bm_round_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      bm_stage: {
        Row: {
          id: number
          name: string
          number: number
          settings: Json
          tournament_id: string
          type: string
        }
        Insert: {
          id?: number
          name: string
          number: number
          settings?: Json
          tournament_id: string
          type: string
        }
        Update: {
          id?: number
          name?: string
          number?: number
          settings?: Json
          tournament_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bm_stage_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country_code: string
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          slug: string
          timezone: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          slug: string
          timezone?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          slug?: string
          timezone?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      premium_admin_audit: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          payload: Json
          subscription_id: string | null
          venue_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          payload?: Json
          subscription_id?: string | null
          venue_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          payload?: Json
          subscription_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premium_admin_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_admin_audit_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "venue_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_admin_audit_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_plan_config: {
        Row: {
          daily_rate_cop: number
          default_duration_days: number
          key: string
          list_price_cop: number | null
          updated_at: string
        }
        Insert: {
          daily_rate_cop: number
          default_duration_days?: number
          key?: string
          list_price_cop?: number | null
          updated_at?: string
        }
        Update: {
          daily_rate_cop?: number
          default_duration_days?: number
          key?: string
          list_price_cop?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      match_alerts: {
        Row: {
          city_id: string
          created_at: string
          enabled: boolean
          format: string | null
          id: string
          level: string | null
          neighborhood: string | null
          sport: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city_id: string
          created_at?: string
          enabled?: boolean
          format?: string | null
          id?: string
          level?: string | null
          neighborhood?: string | null
          sport?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city_id?: string
          created_at?: string
          enabled?: boolean
          format?: string | null
          id?: string
          level?: string | null
          neighborhood?: string | null
          sport?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_alerts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_level_feedback: {
        Row: {
          about_user_id: string
          claim_id: string
          created_at: string
          from_user_id: string
          id: string
          level_ok: boolean
          match_id: string
        }
        Insert: {
          about_user_id: string
          claim_id: string
          created_at?: string
          from_user_id: string
          id?: string
          level_ok: boolean
          match_id: string
        }
        Update: {
          about_user_id?: string
          claim_id?: string
          created_at?: string
          from_user_id?: string
          id?: string
          level_ok?: boolean
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_level_feedback_about_user_id_fkey"
            columns: ["about_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_level_feedback_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "slot_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_level_feedback_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_level_feedback_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_slots: {
        Row: {
          created_at: string
          custom_cost_per_person: number | null
          id: string
          level: string
          match_id: string
          pitch_index: number | null
          position: string
          side: string
          slot_role: string
        }
        Insert: {
          created_at?: string
          custom_cost_per_person?: number | null
          id?: string
          level?: string
          match_id: string
          pitch_index?: number | null
          position?: string
          side?: string
          slot_role?: string
        }
        Update: {
          created_at?: string
          custom_cost_per_person?: number | null
          id?: string
          level?: string
          match_id?: string
          pitch_index?: number | null
          position?: string
          side?: string
          slot_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_slots_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_template_runs: {
        Row: {
          created_at: string
          id: string
          match_id: string
          run_date: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          run_date: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          run_date?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_template_runs_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_template_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "match_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      match_templates: {
        Row: {
          active: boolean
          cost_per_person: number | null
          created_at: string
          day_of_week: number
          duration_min: number
          format: string
          gender_policy: string
          host_id: string
          id: string
          notes: string | null
          open_count: number
          sport: string
          starts_at_time: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          active?: boolean
          cost_per_person?: number | null
          created_at?: string
          day_of_week: number
          duration_min?: number
          format?: string
          gender_policy?: string
          host_id: string
          id?: string
          notes?: string | null
          open_count?: number
          sport?: string
          starts_at_time: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          active?: boolean
          cost_per_person?: number | null
          created_at?: string
          day_of_week?: number
          duration_min?: number
          format?: string
          gender_policy?: string
          host_id?: string
          id?: string
          notes?: string | null
          open_count?: number
          sport?: string
          starts_at_time?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_templates_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_templates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          bm_match_id: number
          clock: number | null
          created_at: string
          created_by: string | null
          id: string
          payload: Json
          period: number | null
          player_id: string | null
          sport: string
          team_side: string
          tournament_id: string
          type: string
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          bm_match_id: number
          clock?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          period?: number | null
          player_id?: string | null
          sport: string
          team_side: string
          tournament_id: string
          type: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          bm_match_id?: number
          clock?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          period?: number | null
          player_id?: string | null
          sport?: string
          team_side?: string
          tournament_id?: string
          type?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_events_bm_match_id_fkey"
            columns: ["bm_match_id"]
            isOneToOne: false
            referencedRelation: "bm_match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "tournament_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_opened_by: string | null
          away_team_name: string | null
          challenge_target_level: string
          city_id: string
          cost_per_person: number | null
          created_at: string
          currency: string
          duration_min: number
          format: string
          formation_id: string | null
          gender_policy: string
          host_id: string
          host_team_name: string | null
          id: string
          match_mode: string
          notes: string | null
          occupy_range: unknown
          rotation_rule: string | null
          share_code: string
          sport: string
          starts_at: string
          status: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          away_opened_by?: string | null
          away_team_name?: string | null
          challenge_target_level?: string
          city_id: string
          cost_per_person?: number | null
          created_at?: string
          currency?: string
          duration_min?: number
          format?: string
          formation_id?: string | null
          gender_policy?: string
          host_id: string
          host_team_name?: string | null
          id?: string
          match_mode?: string
          notes?: string | null
          /** Rellenado por trigger (sync occupy_range). */
          occupy_range?: unknown
          rotation_rule?: string | null
          share_code?: string
          sport?: string
          starts_at: string
          status?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          away_opened_by?: string | null
          away_team_name?: string | null
          challenge_target_level?: string
          city_id?: string
          cost_per_person?: number | null
          created_at?: string
          currency?: string
          duration_min?: number
          format?: string
          formation_id?: string | null
          gender_policy?: string
          host_id?: string
          host_team_name?: string | null
          id?: string
          match_mode?: string
          notes?: string | null
          occupy_range?: unknown
          rotation_rule?: string | null
          share_code?: string
          sport?: string
          starts_at?: string
          status?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_opened_by_fkey"
            columns: ["away_opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      matches_pricing_snapshot: {
        Row: {
          base_cop: number
          discount_cop: number
          final_cop: number
          match_id: string
          overridden_by_owner: boolean
          promo_id: string | null
          snapshotted_at: string
        }
        Insert: {
          base_cop: number
          discount_cop?: number
          final_cop: number
          match_id: string
          overridden_by_owner?: boolean
          promo_id?: string | null
          snapshotted_at?: string
        }
        Update: {
          base_cop?: number
          discount_cop?: number
          final_cop?: number
          match_id?: string
          overridden_by_owner?: boolean
          promo_id?: string | null
          snapshotted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_pricing_snapshot_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_pricing_snapshot_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "venue_promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_contacts: {
        Row: {
          updated_at: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          updated_at?: string
          user_id: string
          whatsapp: string
        }
        Update: {
          updated_at?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city_id: string | null
          created_at: string
          display_name: string
          id: string
          level: string
          level_feedback_count: number
          level_ok_count: number
          preferred_position: string
          preferred_sport: string
          updated_at: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          display_name: string
          id: string
          level?: string
          level_feedback_count?: number
          level_ok_count?: number
          preferred_position?: string
          preferred_sport?: string
          updated_at?: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          level?: string
          level_feedback_count?: number
          level_ok_count?: number
          preferred_position?: string
          preferred_sport?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      push_deliveries: {
        Row: {
          alert_id: string
          created_at: string
          error_code: string | null
          id: string
          match_id: string
          status: string
          subscription_id: string | null
        }
        Insert: {
          alert_id: string
          created_at?: string
          error_code?: string | null
          id?: string
          match_id: string
          status?: string
          subscription_id?: string | null
        }
        Update: {
          alert_id?: string
          created_at?: string
          error_code?: string | null
          id?: string
          match_id?: string
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_deliveries_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "match_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_deliveries_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_claims: {
        Row: {
          created_at: string
          declared_level: string
          id: string
          level_ack_at: string | null
          match_id: string
          player_id: string
          slot_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          declared_level?: string
          id?: string
          level_ack_at?: string | null
          match_id: string
          player_id: string
          slot_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          declared_level?: string
          id?: string
          level_ack_at?: string | null
          match_id?: string
          player_id?: string
          slot_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_claims_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_claims_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_claims_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "match_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_renewal_reminders: {
        Row: {
          channel: string
          created_at: string
          due_at: string
          id: string
          meta: Json
          reminder_type: string
          sent_at: string | null
          status: string
          subscription_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          due_at: string
          id?: string
          meta?: Json
          reminder_type: string
          sent_at?: string | null
          status?: string
          subscription_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          due_at?: string
          id?: string
          meta?: Json
          reminder_type?: string
          sent_at?: string | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_renewal_reminders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "venue_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      player_tournament_stats: {
        Row: {
          id: string
          metrics: Json
          team_member_id: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          metrics?: Json
          team_member_id: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          metrics?: Json
          team_member_id?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_tournament_stats_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "tournament_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_tournament_stats_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_match_audit: {
        Row: {
          action: string
          actor_id: string | null
          bm_match_id: number
          created_at: string
          event_id: string | null
          id: string
          meta: Json
          tournament_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          bm_match_id: number
          created_at?: string
          event_id?: string | null
          id?: string
          meta?: Json
          tournament_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          bm_match_id?: number
          created_at?: string
          event_id?: string | null
          id?: string
          meta?: Json
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_match_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "match_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_audit_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_match_results: {
        Row: {
          bm_match_id: number
          confirmed_at: string
          confirmed_by: string | null
          score_a: number
          score_b: number
          tournament_id: string
        }
        Insert: {
          bm_match_id: number
          confirmed_at?: string
          confirmed_by?: string | null
          score_a: number
          score_b: number
          tournament_id: string
        }
        Update: {
          bm_match_id?: number
          confirmed_at?: string
          confirmed_by?: string | null
          score_a?: number
          score_b?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_match_results_bm_match_id_fkey"
            columns: ["bm_match_id"]
            isOneToOne: false
            referencedRelation: "bm_match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_results_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_results_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_standings: {
        Row: {
          against_score: number
          draws: number
          for_score: number
          id: string
          losses: number
          played: number
          points: number
          team_id: string
          tournament_id: string
          updated_at: string
          wins: number
        }
        Insert: {
          against_score?: number
          draws?: number
          for_score?: number
          id?: string
          losses?: number
          played?: number
          points?: number
          team_id: string
          tournament_id: string
          updated_at?: string
          wins?: number
        }
        Update: {
          against_score?: number
          draws?: number
          for_score?: number
          id?: string
          losses?: number
          played?: number
          points?: number
          team_id?: string
          tournament_id?: string
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_standings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_team_members: {
        Row: {
          created_at: string
          display_name: string
          id: string
          jersey_number: number | null
          team_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          jersey_number?: number | null
          team_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          jersey_number?: number | null
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          bm_participant_id: number | null
          captain_user_id: string | null
          created_at: string
          id: string
          name: string
          seed: number | null
          tournament_id: string
        }
        Insert: {
          bm_participant_id?: number | null
          captain_user_id?: string | null
          created_at?: string
          id?: string
          name: string
          seed?: number | null
          tournament_id: string
        }
        Update: {
          bm_participant_id?: number | null
          captain_user_id?: string | null
          created_at?: string
          id?: string
          name?: string
          seed?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_bm_participant_fkey"
            columns: ["bm_participant_id"]
            isOneToOne: false
            referencedRelation: "bm_participant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_captain_user_id_fkey"
            columns: ["captain_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          created_by: string | null
          format: string
          id: string
          max_teams: number
          name: string
          sport: string
          starts_at: string | null
          status: string
          updated_at: string
          venue_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          format: string
          id?: string
          max_teams?: number
          name: string
          sport: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          venue_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          format?: string
          id?: string
          max_teams?: number
          name?: string
          sport?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          venue_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_booking_events: {
        Row: {
          actor_id: string | null
          booking_id: string
          created_at: string
          from_status: string | null
          id: string
          meta: Json
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          booking_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          meta?: Json
          to_status: string
        }
        Update: {
          actor_id?: string | null
          booking_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          meta?: Json
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_booking_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "venue_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_bookings: {
        Row: {
          amount_cop: number
          base_cop: number
          billed_min: number
          contact_whatsapp: string | null
          created_at: string
          currency: string
          decided_at: string | null
          decided_by: string | null
          deposit_cop: number
          deposit_pct: number
          discount_cop: number
          duration_min: number
          final_cop: number
          hold_expires_at: string | null
          id: string
          legal_accepted_at: string | null
          note: string | null
          occupy_range: unknown
          payment_method: string | null
          player_id: string
          promo_id: string | null
          proof_path: string | null
          reject_reason: string | null
          sport: string
          starts_at: string
          status: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          amount_cop: number
          base_cop: number
          billed_min: number
          contact_whatsapp?: string | null
          created_at?: string
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          deposit_cop: number
          deposit_pct?: number
          discount_cop?: number
          duration_min: number
          final_cop: number
          hold_expires_at?: string | null
          id?: string
          legal_accepted_at?: string | null
          note?: string | null
          occupy_range: unknown
          payment_method?: string | null
          player_id: string
          promo_id?: string | null
          proof_path?: string | null
          reject_reason?: string | null
          sport: string
          starts_at: string
          status?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          amount_cop?: number
          base_cop?: number
          billed_min?: number
          contact_whatsapp?: string | null
          created_at?: string
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          deposit_cop?: number
          deposit_pct?: number
          discount_cop?: number
          duration_min?: number
          final_cop?: number
          hold_expires_at?: string | null
          id?: string
          legal_accepted_at?: string | null
          note?: string | null
          occupy_range?: unknown
          payment_method?: string | null
          player_id?: string
          promo_id?: string | null
          proof_path?: string | null
          reject_reason?: string | null
          sport?: string
          starts_at?: string
          status?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_bookings_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bookings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bookings_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "venue_promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_claims: {
        Row: {
          created_at: string
          email: string | null
          id: string
          note: string
          proof_call_note: string | null
          proof_facade: boolean
          proof_nit: boolean
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          venue_id: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          note: string
          proof_call_note?: string | null
          proof_facade?: boolean
          proof_nit?: boolean
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          venue_id: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          note?: string
          proof_call_note?: string | null
          proof_facade?: boolean
          proof_nit?: boolean
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          venue_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_claims_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          sort_order: number
          uploaded_by: string | null
          url: string
          venue_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          uploaded_by?: string | null
          url: string
          venue_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          uploaded_by?: string | null
          url?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_price_slots: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          price_cop: number
          sport: string
          start_time: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          price_cop: number
          sport: string
          start_time: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          price_cop?: number
          sport?: string
          start_time?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_price_slots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_pricing_default: {
        Row: {
          day_of_week: number
          default_price_cop: number
          sport: string
          venue_id: string
        }
        Insert: {
          day_of_week: number
          default_price_cop: number
          sport: string
          venue_id: string
        }
        Update: {
          day_of_week?: number
          default_price_cop?: number
          sport?: string
          venue_id?: string
        }
        Relationships: []
      }
      venue_pricing_min: {
        Row: {
          min_minutes: number
          sport: string
          venue_id: string
        }
        Insert: {
          min_minutes: number
          sport: string
          venue_id: string
        }
        Update: {
          min_minutes?: number
          sport?: string
          venue_id?: string
        }
        Relationships: []
      }
      venue_promotions: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          date_end: string | null
          date_start: string | null
          days_of_week: number[] | null
          discount_pct: number | null
          end_time: string | null
          id: string
          kind: string
          lead_time_minutes: number
          name: string
          override_price_cop: number | null
          sport: string
          start_time: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          date_end?: string | null
          date_start?: string | null
          days_of_week?: number[] | null
          discount_pct?: number | null
          end_time?: string | null
          id?: string
          kind: string
          lead_time_minutes?: number
          name: string
          override_price_cop?: number | null
          sport: string
          start_time?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          date_end?: string | null
          date_start?: string | null
          days_of_week?: number[] | null
          discount_pct?: number | null
          end_time?: string | null
          id?: string
          kind?: string
          lead_time_minutes?: number
          name?: string
          override_price_cop?: number | null
          sport?: string
          start_time?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_promotions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_staff: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          role: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_staff_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_staff_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_subscription_requests: {
        Row: {
          amount_cop: number
          created_at: string
          duration_days: number
          id: string
          invoice_number: string | null
          legal_accepted_at: string
          payment_method: string
          payment_reference: string | null
          plan: string
          proof_path: string
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          amount_cop: number
          created_at?: string
          duration_days?: number
          id?: string
          invoice_number?: string | null
          legal_accepted_at: string
          payment_method: string
          payment_reference?: string | null
          plan?: string
          proof_path: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          amount_cop?: number
          created_at?: string
          duration_days?: number
          id?: string
          invoice_number?: string | null
          legal_accepted_at?: string
          payment_method?: string
          payment_reference?: string | null
          plan?: string
          proof_path?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_subscription_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_subscription_requests_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "venue_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_subscription_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_subscription_requests_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_subscriptions: {
        Row: {
          auto_renew: boolean
          amount_cop: number | null
          created_at: string
          expires_at: string
          id: string
          payment_method: string | null
          plan: string
          started_at: string
          status: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          auto_renew?: boolean
          amount_cop?: number | null
          created_at?: string
          expires_at: string
          id?: string
          payment_method?: string | null
          plan: string
          started_at?: string
          status: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          auto_renew?: boolean
          amount_cop?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          payment_method?: string | null
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_subscriptions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          booking_deposit_pct: number
          booking_enabled: boolean
          city_id: string
          contact_email: string | null
          contact_whatsapp: string | null
          covered: boolean | null
          created_at: string
          deleted_at: string | null
          id: string
          is_verified: boolean
          lat: number
          lng: number
          name: string
          neighborhood: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          rating: number | null
          slug: string
          sports: string[]
          surface: string
          venue_kind: string
          website: string | null
        }
        Insert: {
          address?: string | null
          booking_deposit_pct?: number
          booking_enabled?: boolean
          city_id: string
          contact_email?: string | null
          contact_whatsapp?: string | null
          covered?: boolean | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_verified?: boolean
          lat: number
          lng: number
          name: string
          neighborhood?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          slug: string
          sports?: string[]
          surface?: string
          venue_kind?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          booking_deposit_pct?: number
          booking_enabled?: boolean
          city_id?: string
          contact_email?: string | null
          contact_whatsapp?: string | null
          covered?: boolean | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_verified?: boolean
          lat?: number
          lng?: number
          name?: string
          neighborhood?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          slug?: string
          sports?: string[]
          surface?: string
          venue_kind?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_has_role: {
        Args: { p_roles: string[]; p_uid?: string }
        Returns: boolean
      }
      append_match_event: {
        Args: {
          p_bm_match_id: number
          p_clock?: number
          p_payload?: Json
          p_period?: number
          p_player_id?: string
          p_team_side: string
          p_tournament_id: string
          p_type: string
        }
        Returns: string
      }
      admin_cancel_venue_premium: {
        Args: { p_note?: string; p_subscription_id: string }
        Returns: string
      }
      admin_extend_venue_premium: {
        Args: {
          p_amount_cop?: number
          p_new_expires_at: string
          p_note?: string
          p_subscription_id: string
        }
        Returns: string
      }
      admin_grant_venue_premium: {
        Args: {
          p_amount_cop?: number
          p_daily_rate_cop?: number
          p_expires_at: string
          p_note?: string
          p_payment_method?: string
          p_started_at: string
          p_venue_id: string
        }
        Returns: string
      }
      admin_set_feature_flag: {
        Args: { p_enabled: boolean; p_key: string }
        Returns: {
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "feature_flags"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_premium_plan_config: {
        Args: {
          p_daily_rate_cop: number
          p_default_duration_days: number
          p_list_price_cop?: number
        }
        Returns: {
          daily_rate_cop: number
          default_duration_days: number
          key: string
          list_price_cop: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "premium_plan_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_match_pricing: {
        Args: { p_match_id: string; p_overridden_price_cop?: number | null }
        Returns: Json
      }
      approve_venue_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      approve_venue_claim: {
        Args: {
          p_claim_id: string
          p_proof_call_note?: string
          p_proof_facade?: boolean
          p_proof_nit?: boolean
        }
        Returns: undefined
      }
      approve_venue_subscription_request: {
        Args: { p_duration_days?: number; p_request_id: string }
        Returns: string
      }
      can_manage_venue_tournaments: {
        Args: { p_uid?: string; p_venue_id: string }
        Returns: boolean
      }
      can_score_tournament: {
        Args: { p_uid?: string; p_venue_id: string }
        Returns: boolean
      }
      cancel_venue_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      claim_slot: {
        Args: {
          p_declared_level: string
          p_level_ack: boolean
          p_slot_id: string
        }
        Returns: string
      }
      claim_venue: {
        Args: {
          p_email?: string
          p_note: string
          p_venue_id: string
          p_whatsapp: string
        }
        Returns: string
      }
      create_match_from_template: {
        Args: { p_run_date: string; p_template_id: string }
        Returns: string
      }
      create_price_slot: {
        Args: {
          p_day_of_week: number
          p_end_time: string
          p_price_cop: number
          p_sport: string
          p_start_time: string
          p_venue_id: string
        }
        Returns: string
      }
      create_tournament: {
        Args: {
          p_format: string
          p_max_teams?: number
          p_name: string
          p_sport: string
          p_starts_at?: string | null
          p_status?: string
          p_venue_id: string
          p_visibility?: string
        }
        Returns: string
      }
      create_promotion: {
        Args: {
          p_date_end?: string | null
          p_date_start?: string | null
          p_days_of_week?: number[] | null
          p_discount_pct?: number | null
          p_end_time?: string | null
          p_kind: string
          p_lead_time_minutes?: number
          p_name: string
          p_override_price_cop?: number | null
          p_sport: string
          p_start_time?: string | null
          p_venue_id: string
        }
        Returns: string
      }
      create_venue: {
        Args: {
          p_address?: string
          p_city_id: string
          p_covered?: boolean | null
          p_lat?: number
          p_lng?: number
          p_name: string
          p_neighborhood?: string
          p_notes?: string | null
          p_sports?: string[]
          p_surface?: string
          p_venue_kind?: string
        }
        Returns: string
      }
      create_venue_subscription: {
        Args: {
          p_duration_days?: number
          p_payment_method?: string
          p_plan: string
          p_venue_id: string
        }
        Returns: string
      }
      deactivate_promotion: { Args: { p_promo_id: string }; Returns: undefined }
      debug_promo_match: { Args: never; Returns: Json }
      delete_price_default: {
        Args: { p_day_of_week: number; p_sport: string; p_venue_id: string }
        Returns: undefined
      }
      delete_price_min: {
        Args: { p_sport: string; p_venue_id: string }
        Returns: undefined
      }
      delete_price_slot: { Args: { p_slot_id: string }; Returns: undefined }
      delete_venue: { Args: { p_venue_id: string }; Returns: undefined }
      expire_venue_booking_holds: { Args: never; Returns: number }
      expire_venue_subscriptions: { Args: never; Returns: number }
      finalize_match_confirm: {
        Args: {
          p_bm_match_id: number
          p_player_metrics?: Json
          p_score_a: number
          p_score_b: number
          p_team_a_id?: string
          p_team_b_id?: string
          p_tournament_id: string
        }
        Returns: undefined
      }
      get_active_subscription: {
        Args: { p_venue_id: string }
        Returns: {
          expires_at: string
          id: string
          plan: string
          started_at: string
          status: string
        }[]
      }
      get_match_contact: {
        Args: { p_claim_id: string }
        Returns: {
          display_name: string
          whatsapp: string
        }[]
      }
      get_venue_stats: {
        Args: {
          p_month_end?: string
          p_month_start?: string
          p_venue_id: string
        }
        Returns: {
          filled_slots: number
          occupancy_rate: number
          total_matches: number
          total_slots: number
        }[]
      }
      has_active_subscription: {
        Args: { p_venue_id: string }
        Returns: boolean
      }
      is_admin: { Args: { p_uid?: string }; Returns: boolean }
      is_venue_staff: {
        Args: { p_roles?: string[]; p_uid?: string; p_venue_id: string }
        Returns: boolean
      }
      list_upcoming_open_match_ids: {
        Args: { p_city_id: string; p_limit?: number }
        Returns: string[]
      }
      list_venue_day_occupancy: {
        Args: {
          p_day_end: string
          p_day_start: string
          p_exclude_booking_id?: string
          p_exclude_match_id?: string
          p_venue_id: string
        }
        Returns: {
          duration_min: number
          format: string
          has_side_b: boolean
          kind: string
          match_id: string
          open_slot_count: number
          share_code: string
          sport: string
          starts_at: string
        }[]
      }
      lookup_venue_occupancy: {
        Args: {
          p_duration_min: number
          p_exclude_booking_id?: string
          p_exclude_match_id?: string
          p_starts_at: string
          p_venue_id: string
        }
        Returns: {
          away_opened_by: string
          duration_min: number
          format: string
          has_side_b: boolean
          host_id: string
          kind: string
          match_id: string
          open_slot_count: number
          share_code: string
          sport: string
          starts_at: string
          venue_id: string
          venue_name: string
        }[]
      }
      open_match_side_b: {
        Args: {
          p_level?: string
          p_match_id: string
          p_open_count: number
          p_position?: string
        }
        Returns: string
      }
      preview_match_price: {
        Args: {
          p_duration_min: number
          p_sport: string
          p_starts_at: string
          p_venue_id: string
        }
        Returns: Json
      }
      preview_match_price_debug: {
        Args: {
          p_duration_min: number
          p_sport: string
          p_starts_at: string
          p_venue_id: string
        }
        Returns: Json
      }
      reject_venue_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: undefined
      }
      reject_venue_claim: {
        Args: { p_claim_id: string; p_reason?: string }
        Returns: undefined
      }
      reject_venue_subscription_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      register_participant: {
        Args: {
          p_captain_user_id?: string | null
          p_members?: Json
          p_name: string
          p_seed?: number | null
          p_tournament_id: string
        }
        Returns: string
      }
      register_tournament_team: {
        Args: {
          p_captain_user_id?: string | null
          p_members?: Json
          p_name: string
          p_seed?: number | null
          p_tournament_id: string
        }
        Returns: string
      }
      release_venue_booking_hold: {
        Args: { p_hold_id: string }
        Returns: undefined
      }
      respond_claim: {
        Args: { p_claim_id: string; p_status: string }
        Returns: undefined
      }
      set_price_default: {
        Args: {
          p_day_of_week: number
          p_default_price_cop: number
          p_sport: string
          p_venue_id: string
        }
        Returns: undefined
      }
      set_price_min: {
        Args: { p_min_minutes: number; p_sport: string; p_venue_id: string }
        Returns: undefined
      }
      set_venue_booking_deposit_pct: {
        Args: { p_deposit_pct: number; p_venue_id: string }
        Returns: undefined
      }
      set_venue_booking_enabled: {
        Args: { p_enabled: boolean; p_venue_id: string }
        Returns: undefined
      }
      start_venue_booking_hold: {
        Args: {
          p_duration_min: number
          p_sport: string
          p_starts_at: string
          p_venue_id: string
        }
        Returns: Json
      }
      submit_level_feedback: {
        Args: { p_claim_id: string; p_level_ok: boolean }
        Returns: string
      }
      submit_venue_booking: {
        Args: {
          p_contact_whatsapp: string
          p_duration_min: number
          p_expected_deposit_cop?: number
          p_expected_final_cop?: number
          p_hold_id?: string
          p_note?: string
          p_payment_method: string
          p_proof_path: string
          p_sport: string
          p_starts_at: string
          p_venue_id: string
        }
        Returns: string
      }
      submit_venue_subscription_request: {
        Args: {
          p_amount_cop: number
          p_duration_days?: number
          p_payment_method: string
          p_payment_reference?: string
          p_plan?: string
          p_proof_path: string
          p_venue_id: string
        }
        Returns: string
      }
      unclaim_venue: { Args: { p_venue_id: string }; Returns: undefined }
      update_match: {
        Args: {
          p_cost_per_person?: number | null
          p_duration_min: number
          p_format: string
          p_formation_id?: string | null
          p_gender_policy: string
          p_match_id: string
          p_notes?: string | null
          p_slots: Json
          p_sport: string
          p_starts_at: string
          p_venue_id: string
        }
        Returns: undefined
      }
      update_price_slot: {
        Args: {
          p_end_time: string
          p_price_cop: number
          p_slot_id: string
          p_start_time: string
        }
        Returns: undefined
      }
      update_venue: {
        Args: {
          p_address?: string
          p_covered?: boolean | null
          p_lat?: number
          p_lng?: number
          p_name?: string
          p_neighborhood?: string
          p_notes?: string
          p_phone?: string
          p_sports?: string[]
          p_surface?: string
          p_venue_id: string
          p_venue_kind?: string
          p_website?: string
        }
        Returns: undefined
      }
      venue_has_active_premium: {
        Args: { p_venue_id: string }
        Returns: boolean
      }
      venue_has_pending_claim: {
        Args: { p_venue_id: string }
        Returns: boolean
      }
      venue_tournaments_flag_on: { Args: never; Returns: boolean }
      void_match_event: { Args: { p_event_id: string }; Returns: string }
      accept_challenge_full_team: {
        Args: {
          p_match_id: string
          p_team_name: string
        }
        Returns: string
      }
      withdraw_claim: { Args: { p_claim_id: string }; Returns: undefined }

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
  public: {
    Enums: {},
  },
} as const
