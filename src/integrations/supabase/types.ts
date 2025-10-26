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
      account_provisioning: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          invite_token: string
          is_active: boolean
          is_used: boolean
          meta: Json | null
          revoked_at: string | null
          role: string
          used_at: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          invite_token?: string
          is_active?: boolean
          is_used?: boolean
          meta?: Json | null
          revoked_at?: string | null
          role?: string
          used_at?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          is_active?: boolean
          is_used?: boolean
          meta?: Json | null
          revoked_at?: string | null
          role?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_provisioning_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_provisioning_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "account_provisioning_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_provisioning_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "account_provisioning_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "account_provisioning_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "account_provisioning_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_provisioning_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          agency_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_id: string | null
          id: string
          title: string
          type: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          title: string
          type: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      agencies: {
        Row: {
          code: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_keys: {
        Row: {
          agency_id: string
          api_key: string
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          agency_id: string
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          agency_id?: string
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agency_keys_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_keys_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_keys_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_keys_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_keys_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_keys_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      agency_managers: {
        Row: {
          agency_id: string
          created_at: string | null
          id: string
          master_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          id?: string
          master_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          id?: string
          master_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_managers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_managers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_managers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_managers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_managers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_managers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_managers_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_managers_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_members: {
        Row: {
          agency_id: string
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_room_overrides: {
        Row: {
          agency_id: string
          color_code: string | null
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          room_type_category: string | null
          room_type_name: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          color_code?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          room_type_category?: string | null
          room_type_name: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          color_code?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          room_type_category?: string | null
          room_type_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          created_at: string
          description: string | null
          endpoint: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["ai_agent_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          name: string
          role: Database["public"]["Enums"]["ai_agent_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: Database["public"]["Enums"]["ai_agent_role"]
          updated_at?: string
        }
        Relationships: []
      }
      ai_anomaly_logs: {
        Row: {
          category: string | null
          description: string | null
          detected_at: string | null
          id: string
          related_function: string | null
          resolved: boolean | null
          resolved_at: string | null
          severity: string | null
          title: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          detected_at?: string | null
          id?: string
          related_function?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string | null
          title?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          detected_at?: string | null
          id?: string
          related_function?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string | null
          title?: string | null
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          category: string
          cause_analysis: string | null
          created_at: string
          description: string
          detected_at: string
          detection_key: string
          id: string
          metadata: Json | null
          recommended_action: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          cause_analysis?: string | null
          created_at?: string
          description: string
          detected_at?: string
          detection_key: string
          id?: string
          metadata?: Json | null
          recommended_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cause_analysis?: string | null
          created_at?: string
          description?: string
          detected_at?: string
          detection_key?: string
          id?: string
          metadata?: Json | null
          recommended_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_mapping_suggestions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          confidence_score: number | null
          created_at: string | null
          event_id: string | null
          id: string
          normalized_data: Json | null
          participant_id: string | null
          status: string | null
          suggested_data: Json
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          normalized_data?: Json | null
          participant_id?: string | null
          status?: string | null
          suggested_data: Json
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          normalized_data?: Json | null
          participant_id?: string | null
          status?: string | null
          suggested_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_mapping_suggestions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_mapping_suggestions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ai_mapping_suggestions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      ai_mappings: {
        Row: {
          accuracy: number | null
          approved_at: string | null
          approved_by: string | null
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          mapping_type: string | null
          metadata: Json | null
          model_version: string | null
          source_field: string
          target_field: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          accuracy?: number | null
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          mapping_type?: string | null
          metadata?: Json | null
          model_version?: string | null
          source_field: string
          target_field: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          accuracy?: number | null
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          mapping_type?: string | null
          metadata?: Json | null
          model_version?: string | null
          source_field?: string
          target_field?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      ai_versions: {
        Row: {
          created_at: string | null
          dataset: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          model_name: string | null
          status: string | null
          updated_at: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          dataset: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          model_name?: string | null
          status?: string | null
          updated_at?: string | null
          version: string
        }
        Update: {
          created_at?: string | null
          dataset?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          model_name?: string | null
          status?: string | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      behavior_logs: {
        Row: {
          action_type: string
          agency_id: string | null
          coordinates: Json | null
          created_at: string | null
          duration_ms: number | null
          element_id: string | null
          event_id: string | null
          id: number
          metadata: Json | null
          page_name: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          agency_id?: string | null
          coordinates?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          element_id?: string | null
          event_id?: string | null
          id?: never
          metadata?: Json | null
          page_name: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          agency_id?: string | null
          coordinates?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          element_id?: string | null
          event_id?: string | null
          id?: never
          metadata?: Json | null
          page_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavior_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "behavior_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "behavior_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "behavior_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "behavior_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "behavior_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "behavior_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      changelogs: {
        Row: {
          action: string
          agency_id: string | null
          created_at: string | null
          diff: Json | null
          event_id: string | null
          id: string
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          agency_id?: string | null
          created_at?: string | null
          diff?: Json | null
          event_id?: string | null
          id?: string
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          agency_id?: string | null
          created_at?: string | null
          diff?: Json | null
          event_id?: string | null
          id?: string
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      context_memory: {
        Row: {
          agency_id: string | null
          context_type: string
          created_at: string | null
          data: Json
          event_id: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          context_type: string
          created_at?: string | null
          data?: Json
          event_id: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          context_type?: string
          created_at?: string | null
          data?: Json
          event_id?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "context_memory_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "context_memory_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "context_memory_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "context_memory_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "context_memory_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "context_memory_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "context_memory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "context_memory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "context_memory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      daily_summaries: {
        Row: {
          agency_id: string | null
          ai_version: string | null
          context_summary: string | null
          context_tokens: Json | null
          created_at: string
          event_id: string
          id: string
          is_active: boolean | null
          key_points_json: Json
          previous_report_id: string | null
          statistics: Json | null
          summary_text: string
          trend_summary: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          ai_version?: string | null
          context_summary?: string | null
          context_tokens?: Json | null
          created_at?: string
          event_id: string
          id?: string
          is_active?: boolean | null
          key_points_json?: Json
          previous_report_id?: string | null
          statistics?: Json | null
          summary_text: string
          trend_summary?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          ai_version?: string | null
          context_summary?: string | null
          context_tokens?: Json | null
          created_at?: string
          event_id?: string
          id?: string
          is_active?: boolean | null
          key_points_json?: Json
          previous_report_id?: string | null
          statistics?: Json | null
          summary_text?: string
          trend_summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_summaries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_summaries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "daily_summaries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_summaries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "daily_summaries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "daily_summaries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "daily_summaries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_summaries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "daily_summaries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "daily_summaries_previous_report_id_fkey"
            columns: ["previous_report_id"]
            isOneToOne: false
            referencedRelation: "daily_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      declaration_logs: {
        Row: {
          created_at: string
          date: string
          declaration_type: string
          declared_by: string | null
          drive_url: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          pdf_url: string | null
          signatories: Json
          version: string
        }
        Insert: {
          created_at?: string
          date?: string
          declaration_type?: string
          declared_by?: string | null
          drive_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          pdf_url?: string | null
          signatories?: Json
          version: string
        }
        Update: {
          created_at?: string
          date?: string
          declaration_type?: string
          declared_by?: string | null
          drive_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          pdf_url?: string | null
          signatories?: Json
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "declaration_logs_declared_by_fkey"
            columns: ["declared_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declaration_logs_declared_by_fkey"
            columns: ["declared_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deploy_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          deployed_at: string
          deployer: string
          deployment_type: string
          github_commit_sha: string | null
          id: string
          metadata: Json | null
          notes: string | null
          status: string
          vercel_deployment_id: string | null
          version: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deployed_at?: string
          deployer: string
          deployment_type: string
          github_commit_sha?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          status?: string
          vercel_deployment_id?: string | null
          version: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deployed_at?: string
          deployer?: string
          deployment_type?: string
          github_commit_sha?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          status?: string
          vercel_deployment_id?: string | null
          version?: string
        }
        Relationships: []
      }
      edge_health: {
        Row: {
          created_at: string | null
          error_rate: number | null
          id: string
          is_active: boolean | null
          last_check_at: string | null
          latency_ms: number | null
          metadata: Json | null
          service: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_check_at?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          service: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_check_at?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          service?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      edge_incidents: {
        Row: {
          affected_operations: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          root_cause: string | null
          service: string
          severity: string
          started_at: string
          status: string
          summary: string
          updated_at: string | null
        }
        Insert: {
          affected_operations?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          service: string
          severity: string
          started_at?: string
          status?: string
          summary: string
          updated_at?: string | null
        }
        Update: {
          affected_operations?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          service?: string
          severity?: string
          started_at?: string
          status?: string
          summary?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edge_incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edge_incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edge_incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edge_incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_room_refs: {
        Row: {
          agency_id: string | null
          created_at: string | null
          credit: number | null
          event_id: string
          hotel_id: string | null
          id: string
          is_active: boolean | null
          local_type_id: string | null
          room_credit: string | null
          room_type_id: string
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          credit?: number | null
          event_id: string
          hotel_id?: string | null
          id?: string
          is_active?: boolean | null
          local_type_id?: string | null
          room_credit?: string | null
          room_type_id: string
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          credit?: number | null
          event_id?: string
          hotel_id?: string | null
          id?: string
          is_active?: boolean | null
          local_type_id?: string | null
          room_credit?: string | null
          room_type_id?: string
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_room_refs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_room_refs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "event_room_refs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_room_refs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "event_room_refs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "event_room_refs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "event_room_refs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_room_refs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_room_refs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_room_refs_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_room_refs_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "event_room_refs_local_type_id_fkey"
            columns: ["local_type_id"]
            isOneToOne: false
            referencedRelation: "room_types_local"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_room_refs_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_room_refs_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["type_id"]
          },
        ]
      }
      events: {
        Row: {
          agency_id: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          location: string | null
          location_id: string | null
          manager_id: string | null
          manager_name: string | null
          name: string
          room_type_refs: string[] | null
          start_date: string | null
          status: string | null
          sync_status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          location_id?: string | null
          manager_id?: string | null
          manager_name?: string | null
          name: string
          room_type_refs?: string[] | null
          start_date?: string | null
          status?: string | null
          sync_status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          location_id?: string | null
          manager_id?: string | null
          manager_name?: string | null
          name?: string
          room_type_refs?: string[] | null
          start_date?: string | null
          status?: string | null
          sync_status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "events_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events_managers: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          profile_id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          profile_id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          profile_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_managers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_managers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "events_managers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "events_managers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_managers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_staff_performance"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      flow_events: {
        Row: {
          event_id: string
          id: string
          progress: number | null
          step: number | null
          title: string | null
          total_steps: number | null
          updated_at: string | null
        }
        Insert: {
          event_id: string
          id?: string
          progress?: number | null
          step?: number | null
          title?: string | null
          total_steps?: number | null
          updated_at?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          progress?: number | null
          step?: number | null
          title?: string | null
          total_steps?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      flowbar_logs: {
        Row: {
          event_id: string
          id: string
          phase_name: string | null
          progress: number | null
          step: number | null
          title: string
          total_steps: number | null
          updated_at: string | null
        }
        Insert: {
          event_id: string
          id?: string
          phase_name?: string | null
          progress?: number | null
          step?: number | null
          title: string
          total_steps?: number | null
          updated_at?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          phase_name?: string | null
          progress?: number | null
          step?: number | null
          title?: string
          total_steps?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      form_logs: {
        Row: {
          action: string
          agency_id: string | null
          ai_version: string | null
          created_at: string
          created_by: string | null
          event_id: string
          form_id: string
          id: string
          is_active: boolean | null
          linked_participant_id: string | null
          metadata: Json | null
          source: string | null
        }
        Insert: {
          action: string
          agency_id?: string | null
          ai_version?: string | null
          created_at?: string
          created_by?: string | null
          event_id: string
          form_id: string
          id?: string
          is_active?: boolean | null
          linked_participant_id?: string | null
          metadata?: Json | null
          source?: string | null
        }
        Update: {
          action?: string
          agency_id?: string | null
          ai_version?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          form_id?: string
          id?: string
          is_active?: boolean | null
          linked_participant_id?: string | null
          metadata?: Json | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_logs_linked_participant_id_fkey"
            columns: ["linked_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_logs_linked_participant_id_fkey"
            columns: ["linked_participant_id"]
            isOneToOne: false
            referencedRelation: "participants_fullview"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          answers: Json | null
          created_at: string | null
          email: string | null
          event_id: string
          form_id: string | null
          id: string
          is_active: boolean | null
          participant_id: string | null
          phone: string | null
          response_data: Json
          status: string | null
          updated_at: string | null
        }
        Insert: {
          answers?: Json | null
          created_at?: string | null
          email?: string | null
          event_id: string
          form_id?: string | null
          id?: string
          is_active?: boolean | null
          participant_id?: string | null
          phone?: string | null
          response_data: Json
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          answers?: Json | null
          created_at?: string | null
          email?: string | null
          event_id?: string
          form_id?: string | null
          id?: string
          is_active?: boolean | null
          participant_id?: string | null
          phone?: string | null
          response_data?: Json
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "form_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants_fullview"
            referencedColumns: ["id"]
          },
        ]
      }
      form_statistics: {
        Row: {
          agency_id: string | null
          created_at: string | null
          event_id: string
          form_id: string
          id: string
          is_active: boolean | null
          statistics_json: Json
          total_responses: number | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          event_id: string
          form_id: string
          id?: string
          is_active?: boolean | null
          statistics_json?: Json
          total_responses?: number | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          event_id?: string
          form_id?: string
          id?: string
          is_active?: boolean | null
          statistics_json?: Json
          total_responses?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      form_summaries: {
        Row: {
          agency_id: string | null
          ai_version: string | null
          created_at: string | null
          event_id: string
          form_id: string
          id: string
          is_active: boolean | null
          key_insights: Json | null
          summary_text: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          ai_version?: string | null
          created_at?: string | null
          event_id: string
          form_id: string
          id?: string
          is_active?: boolean | null
          key_insights?: Json | null
          summary_text?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          ai_version?: string | null
          created_at?: string | null
          event_id?: string
          form_id?: string
          id?: string
          is_active?: boolean | null
          key_insights?: Json | null
          summary_text?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      forms: {
        Row: {
          agency_id: string | null
          ai_prompt: string | null
          ai_version: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_id: string
          form_json: Json | null
          id: string
          is_active: boolean | null
          questions: Json | null
          schema_json: Json | null
          share_enabled: boolean | null
          status: string | null
          sync_status: string | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          agency_id?: string | null
          ai_prompt?: string | null
          ai_version?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id: string
          form_json?: Json | null
          id?: string
          is_active?: boolean | null
          questions?: Json | null
          schema_json?: Json | null
          share_enabled?: boolean | null
          status?: string | null
          sync_status?: string | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          agency_id?: string | null
          ai_prompt?: string | null
          ai_version?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string
          form_json?: Json | null
          id?: string
          is_active?: boolean | null
          questions?: Json | null
          schema_json?: Json | null
          share_enabled?: boolean | null
          status?: string | null
          sync_status?: string | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "forms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "forms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "forms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forms_comparison: {
        Row: {
          agency_id: string | null
          ai_summary: string | null
          ai_version: string | null
          compare_json: Json
          created_at: string
          event_id: string
          form_ids: string[]
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          ai_summary?: string | null
          ai_version?: string | null
          compare_json?: Json
          created_at?: string
          event_id: string
          form_ids: string[]
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          ai_summary?: string | null
          ai_version?: string | null
          compare_json?: Json
          created_at?: string
          event_id?: string
          form_ids?: string[]
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      function_audit_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string | null
          function_name: string
          id: string
          payload: Json | null
          role: Database["public"]["Enums"]["app_role"] | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          function_name: string
          id?: string
          payload?: Json | null
          role?: Database["public"]["Enums"]["app_role"] | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          function_name?: string
          id?: string
          payload?: Json | null
          role?: Database["public"]["Enums"]["app_role"] | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      functions_health: {
        Row: {
          created_at: string | null
          error_message: string | null
          function_name: string
          id: string
          last_checked: string | null
          latency_ms: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          function_name: string
          id?: string
          last_checked?: string | null
          latency_ms?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          function_name?: string
          id?: string
          last_checked?: string | null
          latency_ms?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      guide_views: {
        Row: {
          guide_id: string
          id: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          guide_id: string
          id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          guide_id?: string
          id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_views_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "training_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_check_results: {
        Row: {
          ai_success_rate: number
          created_at: string
          edge_function_latency_ms: number
          id: string
          issues: string | null
          overall_status: string
          storage_usage_percent: number
          supabase_status: string
          timestamp: string
        }
        Insert: {
          ai_success_rate: number
          created_at?: string
          edge_function_latency_ms: number
          id?: string
          issues?: string | null
          overall_status: string
          storage_usage_percent: number
          supabase_status: string
          timestamp?: string
        }
        Update: {
          ai_success_rate?: number
          created_at?: string
          edge_function_latency_ms?: number
          id?: string
          issues?: string | null
          overall_status?: string
          storage_usage_percent?: number
          supabase_status?: string
          timestamp?: string
        }
        Relationships: []
      }
      hotel_contacts: {
        Row: {
          agency_id: string | null
          contact_name: string
          created_at: string
          email: string
          event_id: string
          hotel_name: string
          id: string
          is_active: boolean | null
          note: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          contact_name: string
          created_at?: string
          email: string
          event_id: string
          hotel_name: string
          id?: string
          is_active?: boolean | null
          note?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          event_id?: string
          hotel_name?: string
          id?: string
          is_active?: boolean | null
          note?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_contacts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_contacts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hotel_contacts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      hotel_mail_logs: {
        Row: {
          agency_id: string | null
          created_at: string
          error_details: Json | null
          event_id: string
          hotel_name: string
          id: string
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          error_details?: Json | null
          event_id: string
          hotel_name: string
          id?: string
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          error_details?: Json | null
          event_id?: string
          hotel_name?: string
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_mail_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_mail_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hotel_mail_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      hotel_sources: {
        Row: {
          brand: string | null
          country: string | null
          created_at: string | null
          hotel_name: string
          id: string
          last_verified: string | null
          official_url: string
          rating: number | null
        }
        Insert: {
          brand?: string | null
          country?: string | null
          created_at?: string | null
          hotel_name: string
          id?: string
          last_verified?: string | null
          official_url: string
          rating?: number | null
        }
        Update: {
          brand?: string | null
          country?: string | null
          created_at?: string | null
          hotel_name?: string
          id?: string
          last_verified?: string | null
          official_url?: string
          rating?: number | null
        }
        Relationships: []
      }
      hotels: {
        Row: {
          agency_id: string | null
          alias: string[] | null
          brand: string | null
          city: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          alias?: string[] | null
          brand?: string | null
          city: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          alias?: string[] | null
          brand?: string | null
          city?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rating?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "hotels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "hotels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "hotels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      hotels_cache: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          keyword: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id?: string
          keyword: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          keyword?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      insight_recommendations: {
        Row: {
          agency_id: string | null
          ai_confidence: number | null
          ai_version: string | null
          applied_at: string | null
          applied_by: string | null
          category: string
          content: string
          created_at: string
          event_id: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          priority: string
          status: string | null
          updated_at: string
          user_feedback: string | null
        }
        Insert: {
          agency_id?: string | null
          ai_confidence?: number | null
          ai_version?: string | null
          applied_at?: string | null
          applied_by?: string | null
          category: string
          content: string
          created_at?: string
          event_id: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          priority: string
          status?: string | null
          updated_at?: string
          user_feedback?: string | null
        }
        Update: {
          agency_id?: string | null
          ai_confidence?: number | null
          ai_version?: string | null
          applied_at?: string | null
          applied_by?: string | null
          category?: string
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          priority?: string
          status?: string | null
          updated_at?: string
          user_feedback?: string | null
        }
        Relationships: []
      }
      invite_links: {
        Row: {
          agency_id: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "invite_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "invite_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "invite_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "invite_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_links_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_links_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          action: string | null
          actor_role: string | null
          agency_id: string | null
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string
          payload: Json | null
          target_table: string | null
        }
        Insert: {
          action?: string | null
          actor_role?: string | null
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          payload?: Json | null
          target_table?: string | null
        }
        Update: {
          action?: string | null
          actor_role?: string | null
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          payload?: Json | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      master_accounts: {
        Row: {
          active_users: number | null
          agency_id: string | null
          agency_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          updated_at: string | null
        }
        Insert: {
          active_users?: number | null
          agency_id?: string | null
          agency_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          updated_at?: string | null
        }
        Update: {
          active_users?: number | null
          agency_id?: string | null
          agency_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "master_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "master_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "master_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      message_logs: {
        Row: {
          agency_id: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          message_content: string
          sent_at: string | null
          status: string | null
          target_name: string
          target_phone: string
          template_id: string | null
        }
        Insert: {
          agency_id?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          message_content: string
          sent_at?: string | null
          status?: string | null
          target_name: string
          target_phone: string
          template_id?: string | null
        }
        Update: {
          agency_id?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          message_content?: string
          sent_at?: string | null
          status?: string | null
          target_name?: string
          target_phone?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "message_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "message_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "message_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "message_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "message_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "message_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          agency_id: string | null
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "message_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "message_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "message_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      messages: {
        Row: {
          agency_id: string | null
          body: string | null
          channel: string | null
          created_at: string | null
          created_by: string | null
          event_id: string
          id: string
          is_active: boolean | null
          merge_vars: string[] | null
          recipient: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          sync_status: string | null
          template_id: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          agency_id?: string | null
          body?: string | null
          channel?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          merge_vars?: string[] | null
          recipient?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          sync_status?: string | null
          template_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          agency_id?: string | null
          body?: string | null
          channel?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          merge_vars?: string[] | null
          recipient?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          sync_status?: string | null
          template_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "messages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "messages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "messages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_insights: {
        Row: {
          agency_id: string | null
          created_at: string | null
          detail: Json | null
          id: string
          level: string
          module: string
          title: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          detail?: Json | null
          id?: string
          level: string
          module: string
          title: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          detail?: Json | null
          id?: string
          level?: string
          module?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_insights_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_insights_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "module_insights_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_insights_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "module_insights_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "module_insights_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          level: string | null
          meta: Json | null
          read: boolean | null
          scope: string | null
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          level?: string | null
          meta?: Json | null
          read?: boolean | null
          scope?: string | null
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          level?: string | null
          meta?: Json | null
          read?: boolean | null
          scope?: string | null
          title?: string | null
        }
        Relationships: []
      }
      ops_executions: {
        Row: {
          created_at: string | null
          dedup_key: string | null
          finished_at: string | null
          id: string
          playbook_key: string
          result: Json | null
          started_at: string | null
          status: string | null
          trigger_payload: Json | null
          trigger_source: string
        }
        Insert: {
          created_at?: string | null
          dedup_key?: string | null
          finished_at?: string | null
          id?: string
          playbook_key: string
          result?: Json | null
          started_at?: string | null
          status?: string | null
          trigger_payload?: Json | null
          trigger_source: string
        }
        Update: {
          created_at?: string | null
          dedup_key?: string | null
          finished_at?: string | null
          id?: string
          playbook_key?: string
          result?: Json | null
          started_at?: string | null
          status?: string | null
          trigger_payload?: Json | null
          trigger_source?: string
        }
        Relationships: []
      }
      ops_playbooks: {
        Row: {
          actions: Json
          created_at: string | null
          enabled: boolean | null
          id: string
          key: string
          name: string
        }
        Insert: {
          actions: Json
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          key: string
          name: string
        }
        Update: {
          actions?: Json
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      participant_insights: {
        Row: {
          agency_id: string | null
          ai_summary: string | null
          ai_version: string | null
          created_at: string
          event_id: string
          id: string
          is_active: boolean | null
          participant_id: string
          score_json: Json
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          ai_summary?: string | null
          ai_version?: string | null
          created_at?: string
          event_id: string
          id?: string
          is_active?: boolean | null
          participant_id: string
          score_json?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          ai_summary?: string | null
          ai_version?: string | null
          created_at?: string
          event_id?: string
          id?: string
          is_active?: boolean | null
          participant_id?: string
          score_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          agency_id: string | null
          call_completed: boolean | null
          call_completed_at: string | null
          check_in: string | null
          check_out: string | null
          checkin_day: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          event_id: string
          id: string
          is_active: boolean | null
          last_modified_at: string | null
          last_modified_by: string | null
          manager_info: Json | null
          manager_name: string | null
          manager_phone: string | null
          memo: string | null
          name: string
          organization: string | null
          participation_type: string | null
          phone: string | null
          position: string | null
          role_type: string | null
          room_type: string | null
          sort_priority: number | null
          status: string | null
          sync_status: string | null
          tags: string[] | null
          team_name: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          call_completed?: boolean | null
          call_completed_at?: string | null
          check_in?: string | null
          check_out?: string | null
          checkin_day?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          manager_info?: Json | null
          manager_name?: string | null
          manager_phone?: string | null
          memo?: string | null
          name: string
          organization?: string | null
          participation_type?: string | null
          phone?: string | null
          position?: string | null
          role_type?: string | null
          room_type?: string | null
          sort_priority?: number | null
          status?: string | null
          sync_status?: string | null
          tags?: string[] | null
          team_name?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          call_completed?: boolean | null
          call_completed_at?: string | null
          check_in?: string | null
          check_out?: string | null
          checkin_day?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          manager_info?: Json | null
          manager_name?: string | null
          manager_phone?: string | null
          memo?: string | null
          name?: string
          organization?: string | null
          participation_type?: string | null
          phone?: string | null
          position?: string | null
          role_type?: string | null
          room_type?: string | null
          sort_priority?: number | null
          status?: string | null
          sync_status?: string | null
          tags?: string[] | null
          team_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "participants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participants_log: {
        Row: {
          action: string | null
          changed_at: string | null
          changed_by: string | null
          event_id: string | null
          id: number
          metadata: Json | null
          new_status: string | null
          old_status: string | null
          operation: string
          participant_id: string
          snapshot: Json
        }
        Insert: {
          action?: string | null
          changed_at?: string | null
          changed_by?: string | null
          event_id?: string | null
          id?: never
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          operation: string
          participant_id: string
          snapshot: Json
        }
        Update: {
          action?: string | null
          changed_at?: string | null
          changed_by?: string | null
          event_id?: string | null
          id?: never
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          operation?: string
          participant_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "participants_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "participants_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "participants_log_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_log_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants_fullview"
            referencedColumns: ["id"]
          },
        ]
      }
      participants_logs: {
        Row: {
          changes: Json | null
          id: string
          participant_id: string | null
          source: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          changes?: Json | null
          id?: string
          participant_id?: string | null
          source?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          changes?: Json | null
          id?: string
          participant_id?: string | null
          source?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_logs_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_logs_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants_fullview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_logs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_logs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participants_temp: {
        Row: {
          agency_id: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          event_id: string
          id: string
          is_active: boolean | null
          manager_info: Json | null
          memo: string | null
          participant_name: string | null
          phone: string | null
          position: string | null
          role_type: string | null
          sfe_client_code: string | null
          sfe_store_code: string | null
          stay_plan: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          manager_info?: Json | null
          memo?: string | null
          participant_name?: string | null
          phone?: string | null
          position?: string | null
          role_type?: string | null
          sfe_client_code?: string | null
          sfe_store_code?: string | null
          stay_plan?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          manager_info?: Json | null
          memo?: string | null
          participant_name?: string | null
          phone?: string | null
          position?: string | null
          role_type?: string | null
          sfe_client_code?: string | null
          sfe_store_code?: string | null
          stay_plan?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_temp_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_temp_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "participants_temp_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      phase_completion_log: {
        Row: {
          completed_by: string | null
          completion_notes: string | null
          created_at: string
          id: string
          metadata: Json | null
          phase_id: string
        }
        Insert: {
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          phase_id: string
        }
        Update: {
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          phase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase_completion_log_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_completion_log_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_map: {
        Row: {
          agent_role: string
          base_prompt: string
          created_at: string | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          temperature: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          agent_role: string
          base_prompt: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          temperature?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          agent_role?: string
          base_prompt?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          temperature?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      qa_actions_log: {
        Row: {
          action_type: string
          agency_id: string | null
          created_at: string | null
          error_message: string | null
          event_id: string | null
          id: string
          qa_event_id: string | null
          response_data: Json | null
          rule_id: string | null
          status: string
          target: string | null
        }
        Insert: {
          action_type: string
          agency_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          qa_event_id?: string | null
          response_data?: Json | null
          rule_id?: string | null
          status: string
          target?: string | null
        }
        Update: {
          action_type?: string
          agency_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          qa_event_id?: string | null
          response_data?: Json | null
          rule_id?: string | null
          status?: string
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_actions_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_actions_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "qa_actions_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_actions_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "qa_actions_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "qa_actions_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "qa_actions_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_actions_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "qa_actions_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "qa_actions_log_qa_event_id_fkey"
            columns: ["qa_event_id"]
            isOneToOne: false
            referencedRelation: "qa_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_actions_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "qa_alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_alert_rules: {
        Row: {
          action_config: Json | null
          action_type: string
          agency_id: string | null
          condition_json: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          name: string
          severity: string
          source: string
          updated_at: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          agency_id?: string | null
          condition_json?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          severity: string
          source: string
          updated_at?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          agency_id?: string | null
          condition_json?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          severity?: string
          source?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_alert_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_alert_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "qa_alert_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_alert_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "qa_alert_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "qa_alert_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "qa_alert_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_alert_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_alert_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_alert_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "qa_alert_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      qa_events: {
        Row: {
          agency_id: string | null
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          level: string
          message: string
          meta_json: Json | null
          source: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          level: string
          message: string
          meta_json?: Json | null
          source: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          level?: string
          message?: string
          meta_json?: Json | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "qa_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "qa_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "qa_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "qa_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "qa_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      qa_master_checklist: {
        Row: {
          category: string
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          is_active: boolean | null
          item_description: string
          module: string
          notes: string | null
          phase_id: string
          priority: string
          remediation_link: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          item_description: string
          module: string
          notes?: string | null
          phase_id: string
          priority?: string
          remediation_link?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          item_description?: string
          module?: string
          notes?: string | null
          phase_id?: string
          priority?: string
          remediation_link?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_master_checklist_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_master_checklist_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_reports: {
        Row: {
          ai_recommendations: string | null
          category: string | null
          critical_count: number | null
          generated_at: string | null
          id: string
          info_count: number | null
          period_end: string | null
          period_start: string | null
          report_json: Json | null
          status: string | null
          summary: string | null
          title: string | null
          total_anomalies: number | null
          warning_count: number | null
        }
        Insert: {
          ai_recommendations?: string | null
          category?: string | null
          critical_count?: number | null
          generated_at?: string | null
          id?: string
          info_count?: number | null
          period_end?: string | null
          period_start?: string | null
          report_json?: Json | null
          status?: string | null
          summary?: string | null
          title?: string | null
          total_anomalies?: number | null
          warning_count?: number | null
        }
        Update: {
          ai_recommendations?: string | null
          category?: string | null
          critical_count?: number | null
          generated_at?: string | null
          id?: string
          info_count?: number | null
          period_end?: string | null
          period_start?: string | null
          report_json?: Json | null
          status?: string | null
          summary?: string | null
          title?: string | null
          total_anomalies?: number | null
          warning_count?: number | null
        }
        Relationships: []
      }
      realtime_health: {
        Row: {
          channel_name: string
          created_at: string | null
          error_message: string | null
          id: string
          is_connected: boolean | null
          last_event: string | null
          message_count: number | null
          updated_at: string | null
        }
        Insert: {
          channel_name: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_connected?: boolean | null
          last_event?: string | null
          message_count?: number | null
          updated_at?: string | null
        }
        Update: {
          channel_name?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_connected?: boolean | null
          last_event?: string | null
          message_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      remediation_executions: {
        Row: {
          action_payload: Json | null
          action_type: string
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          qa_event_id: string | null
          result_data: Json | null
          rule_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          action_payload?: Json | null
          action_type: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          qa_event_id?: string | null
          result_data?: Json | null
          rule_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          action_payload?: Json | null
          action_type?: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          qa_event_id?: string | null
          result_data?: Json | null
          rule_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "remediation_executions_qa_event_id_fkey"
            columns: ["qa_event_id"]
            isOneToOne: false
            referencedRelation: "qa_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remediation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "remediation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      remediation_rules: {
        Row: {
          action_payload_json: Json
          action_type: string
          cooldown_sec: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          execution_count: number | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          match_level: string
          match_pattern: Json | null
          match_source: string
          max_executions_per_hour: number | null
          name: string
          runbook_id: string | null
          success_count: number | null
          updated_at: string | null
        }
        Insert: {
          action_payload_json?: Json
          action_type: string
          cooldown_sec?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          match_level: string
          match_pattern?: Json | null
          match_source: string
          max_executions_per_hour?: number | null
          name: string
          runbook_id?: string | null
          success_count?: number | null
          updated_at?: string | null
        }
        Update: {
          action_payload_json?: Json
          action_type?: string
          cooldown_sec?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          match_level?: string
          match_pattern?: Json | null
          match_source?: string
          max_executions_per_hour?: number | null
          name?: string
          runbook_id?: string | null
          success_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remediation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remediation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remediation_rules_runbook_id_fkey"
            columns: ["runbook_id"]
            isOneToOne: false
            referencedRelation: "runbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          agency_id: string | null
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string
          metrics: Json | null
          recommendations: Json | null
          report_type: string
          summary_text: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          metrics?: Json | null
          recommendations?: Json | null
          report_type: string
          summary_text?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          metrics?: Json | null
          recommendations?: Json | null
          report_type?: string
          summary_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      reports_log: {
        Row: {
          agency_id: string | null
          created_at: string | null
          created_by: string | null
          event_id: string
          export_format: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          report_id: string | null
          sent_to_slack: boolean | null
          slack_sent_at: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id: string
          export_format?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          report_id?: string | null
          sent_to_slack?: boolean | null
          slack_sent_at?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          export_format?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          report_id?: string | null
          sent_to_slack?: boolean | null
          slack_sent_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      response_patterns: {
        Row: {
          agency_id: string | null
          ai_score: number | null
          ai_version: string | null
          created_at: string
          event_id: string
          form_id: string
          id: string
          is_active: boolean | null
          pattern_json: Json
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          ai_score?: number | null
          ai_version?: string | null
          created_at?: string
          event_id: string
          form_id: string
          id?: string
          is_active?: boolean | null
          pattern_json?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          ai_score?: number | null
          ai_version?: string | null
          created_at?: string
          event_id?: string
          form_id?: string
          id?: string
          is_active?: boolean | null
          pattern_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      role_audit: {
        Row: {
          actor_user_id: string | null
          agency_id: string | null
          created_at: string
          event_id: string | null
          id: string
          metadata: Json | null
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"]
          rollback_id: string | null
          target_user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          agency_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          metadata?: Json | null
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"]
          rollback_id?: string | null
          target_user_id: string
        }
        Update: {
          actor_user_id?: string | null
          agency_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          metadata?: Json | null
          new_role?: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"]
          rollback_id?: string | null
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_audit_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_audit_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_audit_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_audit_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "role_audit_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_audit_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "role_audit_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "role_audit_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "role_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "role_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "role_audit_rollback_id_fkey"
            columns: ["rollback_id"]
            isOneToOne: false
            referencedRelation: "role_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_audit_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_audit_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          agency_id: string | null
          created_at: string | null
          default_credit: number | null
          description: string | null
          hotel_id: string | null
          id: string
          is_active: boolean | null
          source: string | null
          type_name: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          default_credit?: number | null
          description?: string | null
          hotel_id?: string | null
          id?: string
          is_active?: boolean | null
          source?: string | null
          type_name: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          default_credit?: number | null
          description?: string | null
          hotel_id?: string | null
          id?: string
          is_active?: boolean | null
          source?: string | null
          type_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "room_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "room_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "room_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["hotel_id"]
          },
        ]
      }
      room_types_cache: {
        Row: {
          agency_id: string | null
          city: string | null
          created_at: string | null
          hotel_id: string | null
          hotel_name: string
          id: string
          is_verified: boolean | null
          room_types: Json | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          city?: string | null
          created_at?: string | null
          hotel_id?: string | null
          hotel_name: string
          id?: string
          is_verified?: boolean | null
          room_types?: Json | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          city?: string | null
          created_at?: string | null
          hotel_id?: string | null
          hotel_name?: string
          id?: string
          is_verified?: boolean | null
          room_types?: Json | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_types_cache_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_cache_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "room_types_cache_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_cache_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "room_types_cache_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "room_types_cache_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "room_types_cache_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_cache_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["hotel_id"]
          },
        ]
      }
      room_types_local: {
        Row: {
          agency_id: string
          created_at: string
          hotel_id: string
          id: string
          is_active: boolean
          is_verified: boolean
          last_edited_at: string
          last_edited_by: string | null
          notes: string | null
          room_types: Json
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          hotel_id: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          last_edited_at?: string
          last_edited_by?: string | null
          notes?: string | null
          room_types?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          hotel_id?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          last_edited_at?: string
          last_edited_by?: string | null
          notes?: string | null
          room_types?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_types_local_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_local_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "room_types_local_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_local_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "room_types_local_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "room_types_local_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "room_types_local_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_local_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "room_types_local_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_local_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types_temp: {
        Row: {
          bed_type: string | null
          created_at: string | null
          default_credit: number | null
          hotel_name: string
          id: string
          is_active: boolean | null
          room_size: string | null
          source: string | null
          type_name: string
          updated_at: string | null
        }
        Insert: {
          bed_type?: string | null
          created_at?: string | null
          default_credit?: number | null
          hotel_name: string
          id?: string
          is_active?: boolean | null
          room_size?: string | null
          source?: string | null
          type_name: string
          updated_at?: string | null
        }
        Update: {
          bed_type?: string | null
          created_at?: string | null
          default_credit?: number | null
          hotel_name?: string
          id?: string
          is_active?: boolean | null
          room_size?: string | null
          source?: string | null
          type_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rooming_participants: {
        Row: {
          agency_id: string | null
          check_in: string | null
          check_out: string | null
          created_at: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          memo: string | null
          participant_id: string | null
          room_type: string | null
          stay_days: number | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          memo?: string | null
          participant_id?: string | null
          room_type?: string | null
          stay_days?: number | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          memo?: string | null
          participant_id?: string | null
          room_type?: string | null
          stay_days?: number | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooming_participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooming_participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "rooming_participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooming_participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "rooming_participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "rooming_participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "rooming_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooming_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "rooming_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "rooming_participants_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooming_participants_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants_fullview"
            referencedColumns: ["id"]
          },
        ]
      }
      runbooks: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          estimated_time_minutes: number | null
          id: string
          is_active: boolean | null
          key: string
          last_used_at: string | null
          metadata: Json | null
          severity: string | null
          steps_md: string
          tags: string[] | null
          title: string
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          key: string
          last_used_at?: string | null
          metadata?: Json | null
          severity?: string | null
          steps_md: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          key?: string
          last_used_at?: string | null
          metadata?: Json | null
          severity?: string | null
          steps_md?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "runbooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runbooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          created_at: string
          device_info: string | null
          event: string
          id: string
          ip_address: string | null
          meta_json: Json | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          event: string
          id?: string
          ip_address?: string | null
          meta_json?: Json | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_info?: string | null
          event?: string
          id?: string
          ip_address?: string | null
          meta_json?: Json | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      summary_logs: {
        Row: {
          created_at: string
          date: string
          error_rate: number | null
          fail_rows: number | null
          health_status: string | null
          id: string
          success_rows: number | null
          total_rows: number | null
          total_uploads: number | null
          unique_events: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          error_rate?: number | null
          fail_rows?: number | null
          health_status?: string | null
          id?: string
          success_rows?: number | null
          total_rows?: number | null
          total_uploads?: number | null
          unique_events?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          error_rate?: number | null
          fail_rows?: number | null
          health_status?: string | null
          id?: string
          success_rows?: number | null
          total_rows?: number | null
          total_uploads?: number | null
          unique_events?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      system_cache: {
        Row: {
          key: string
          payload: Json
          updated_at: string | null
        }
        Insert: {
          key: string
          payload: Json
          updated_at?: string | null
        }
        Update: {
          key?: string
          payload?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: number
          level: string | null
          metadata: Json | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          level?: string | null
          metadata?: Json | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          level?: string | null
          metadata?: Json | null
          title?: string
        }
        Relationships: []
      }
      training_guides: {
        Row: {
          category: string
          content_md: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          is_published: boolean | null
          order_index: number | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category: string
          content_md: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          content_md?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_guides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_guides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_logs: {
        Row: {
          actor_id: string | null
          created_at: string | null
          error_details: Json | null
          event_id: string
          fail_count: number | null
          file_name: string
          id: string
          mode: string
          success_count: number | null
          total_count: number | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          error_details?: Json | null
          event_id: string
          fail_count?: number | null
          file_name: string
          id?: string
          mode: string
          success_count?: number | null
          total_count?: number | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          error_details?: Json | null
          event_id?: string
          fail_count?: number | null
          file_name?: string
          id?: string
          mode?: string
          success_count?: number | null
          total_count?: number | null
        }
        Relationships: []
      }
      user_event_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_event_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_event_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "user_event_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          accent_color: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accent_color?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accent_color?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          agency_id: string | null
          created_at: string | null
          event_ids: string[] | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          event_ids?: string[] | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          event_ids?: string[] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_feedback: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string
          feedback_text: string
          id: string
          rating: number | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id: string
          feedback_text: string
          id?: string
          rating?: number | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          feedback_text?: string
          id?: string
          rating?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "vendor_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "vendor_feedback_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_performance: {
        Row: {
          ai_summary: string | null
          communication_score: number | null
          cooperation_score: number | null
          created_at: string | null
          event_id: string
          id: number
          punctuality_score: number | null
          quality_score: number | null
          relationship_index: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          ai_summary?: string | null
          communication_score?: number | null
          cooperation_score?: number | null
          created_at?: string | null
          event_id: string
          id?: never
          punctuality_score?: number | null
          quality_score?: number | null
          relationship_index?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          ai_summary?: string | null
          communication_score?: number | null
          cooperation_score?: number | null
          created_at?: string | null
          event_id?: string
          id?: never
          punctuality_score?: number | null
          quality_score?: number | null
          relationship_index?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_performance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_performance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "vendor_performance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "vendor_performance_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_scores: {
        Row: {
          agency_id: string | null
          ai_summary: string | null
          created_at: string | null
          created_by: string | null
          criteria: string
          event_id: string
          id: string
          note: string | null
          score: number
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          agency_id?: string | null
          ai_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          criteria: string
          event_id: string
          id?: string
          note?: string | null
          score: number
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          agency_id?: string | null
          ai_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          criteria?: string
          event_id?: string
          id?: string
          note?: string | null
          score?: number
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "vendor_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_insights_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "vendor_scores_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          agency_id: string | null
          category: string
          contact: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          category: string
          contact?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          category?: string
          contact?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "vendors_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "vendors_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "vendors_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
        ]
      }
    }
    Views: {
      admin_audit_view: {
        Row: {
          created_at: string | null
          delta: number | null
          device_info: string | null
          event_name: string | null
          id: string | null
          ip_address: string | null
          metadata: Json | null
          metric: string | null
          new_role: string | null
          old_role: string | null
          source_type: string | null
          success: boolean | null
          user_id: string | null
        }
        Relationships: []
      }
      agency_performance_summary: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          agency_since: string | null
          ai_operations: number | null
          ai_usage_rate: number | null
          is_active: boolean | null
          last_activity: string | null
          message_success_rate: number | null
          messages_sent: number | null
          total_events: number | null
          total_logs: number | null
          total_messages: number | null
        }
        Relationships: []
      }
      agency_summary: {
        Row: {
          code: string | null
          created_at: string | null
          event_count: number | null
          id: string | null
          is_active: boolean | null
          last_activity: string | null
          name: string | null
          participant_count: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          event_count?: never
          id?: string | null
          is_active?: boolean | null
          last_activity?: never
          name?: string | null
          participant_count?: never
        }
        Update: {
          code?: string | null
          created_at?: string | null
          event_count?: never
          id?: string | null
          is_active?: boolean | null
          last_activity?: never
          name?: string | null
          participant_count?: never
        }
        Relationships: []
      }
      ai_insights_summary: {
        Row: {
          count: number | null
          latest_detection: string | null
          severity: string | null
        }
        Relationships: []
      }
      dashboard_metrics: {
        Row: {
          activities_count: number | null
          agency_code: string | null
          agency_id: string | null
          agency_name: string | null
          events_count: number | null
          last_updated: string | null
          participants_count: number | null
        }
        Relationships: []
      }
      edge_metrics_24h: {
        Row: {
          avg_error_rate: number | null
          avg_latency_ms: number | null
          check_count: number | null
          first_check: string | null
          last_check: string | null
          max_error_rate: number | null
          p95_latency_ms: number | null
          service: string | null
        }
        Relationships: []
      }
      error_logs_recent: {
        Row: {
          created_at: string | null
          id: string | null
          level: string | null
          message: string | null
          module: string | null
        }
        Relationships: []
      }
      flow_ops_intelligence: {
        Row: {
          avg_progress: number | null
          current_phase: string | null
          current_progress: number | null
          event_id: string | null
          last_update: string | null
          latest_step: number | null
          progress_state: string | null
          total_logs: number | null
        }
        Relationships: []
      }
      flow_ops_summary: {
        Row: {
          avg_progress: number | null
          current_step: number | null
          event_id: string | null
          last_updated: string | null
          latest_progress: number | null
          latest_title: string | null
          log_count: number | null
          total_steps: number | null
        }
        Relationships: []
      }
      flow_participants_summary: {
        Row: {
          event_id: string | null
          org_count: number | null
          role_variety: number | null
          total: number | null
        }
        Relationships: []
      }
      latest_health_check: {
        Row: {
          ai_success_rate: number | null
          created_at: string | null
          edge_function_latency_ms: number | null
          id: string | null
          issues: string | null
          overall_status: string | null
          storage_usage_percent: number | null
          supabase_status: string | null
          timestamp: string | null
        }
        Relationships: []
      }
      logs_combined_view: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string | null
          payload: Json | null
          source: string | null
          target_id: string | null
        }
        Relationships: []
      }
      master_agency_overview: {
        Row: {
          activity_count: number | null
          agency_code: string | null
          agency_id: string | null
          agency_name: string | null
          events_count: number | null
          is_active: boolean | null
          last_activity: string | null
          member_count: number | null
          participants_count: number | null
          status: string | null
        }
        Insert: {
          activity_count?: never
          agency_code?: string | null
          agency_id?: string | null
          agency_name?: string | null
          events_count?: never
          is_active?: boolean | null
          last_activity?: never
          member_count?: never
          participants_count?: never
          status?: never
        }
        Update: {
          activity_count?: never
          agency_code?: string | null
          agency_id?: string | null
          agency_name?: string | null
          events_count?: never
          is_active?: boolean | null
          last_activity?: never
          member_count?: never
          participants_count?: never
          status?: never
        }
        Relationships: []
      }
      master_system_insights: {
        Row: {
          avg_processing_time: number | null
          success_rate: number | null
          total_channels: number | null
          total_functions: number | null
          total_reports: number | null
          warning_count: number | null
        }
        Relationships: []
      }
      master_users: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          created_at: string | null
          email: string | null
          id: string | null
          role: string | null
        }
        Insert: {
          agency_id?: never
          agency_name?: never
          created_at?: string | null
          email?: string | null
          id?: string | null
          role?: never
        }
        Update: {
          agency_id?: never
          agency_name?: never
          created_at?: string | null
          email?: string | null
          id?: string | null
          role?: never
        }
        Relationships: []
      }
      participants_fullview: {
        Row: {
          agency_id: string | null
          call_completed: boolean | null
          call_completed_at: string | null
          check_in: string | null
          check_out: string | null
          created_at: string | null
          email: string | null
          event_id: string | null
          form_response_data: Json | null
          form_response_id: string | null
          form_status: string | null
          form_updated_at: string | null
          id: string | null
          is_active: boolean | null
          last_modified_at: string | null
          last_modified_by: string | null
          manager_name: string | null
          manager_phone: string | null
          memo: string | null
          name: string | null
          organization: string | null
          participation_type: string | null
          phone: string | null
          position: string | null
          role_type: string | null
          room_type: string | null
          status: string | null
          tags: string[] | null
          team_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "participants_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_reports_latest: {
        Row: {
          ai_recommendations: string | null
          category: string | null
          critical_count: number | null
          generated_at: string | null
          id: string | null
          info_count: number | null
          period_end: string | null
          period_start: string | null
          report_json: Json | null
          status: string | null
          summary: string | null
          title: string | null
          total_anomalies: number | null
          warning_count: number | null
        }
        Relationships: []
      }
      system_logs_view: {
        Row: {
          action: string | null
          actor_role: string | null
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string | null
          messages_failed: number | null
          messages_pending: number | null
          messages_sent: number | null
          payload: Json | null
          target_table: string | null
          total_upload_fail: number | null
          total_upload_success: number | null
          total_uploads: number | null
        }
        Insert: {
          action?: string | null
          actor_role?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string | null
          messages_failed?: never
          messages_pending?: never
          messages_sent?: never
          payload?: Json | null
          target_table?: string | null
          total_upload_fail?: never
          total_upload_success?: never
          total_uploads?: never
        }
        Update: {
          action?: string | null
          actor_role?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string | null
          messages_failed?: never
          messages_pending?: never
          messages_sent?: never
          payload?: Json | null
          target_table?: string | null
          total_upload_fail?: never
          total_upload_success?: never
          total_uploads?: never
        }
        Relationships: [
          {
            foreignKeyName: "logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          created_at: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          last_sign_in_at: string | null
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      v_event_room_summary: {
        Row: {
          credit: number | null
          event_id: string | null
          hotel_id: string | null
          hotel_name: string | null
          local_type_id: string | null
          room_type: string | null
          room_type_id: string | null
          stock: number | null
          type_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_room_refs_local_type_id_fkey"
            columns: ["local_type_id"]
            isOneToOne: false
            referencedRelation: "room_types_local"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_room_refs_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_room_refs_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "v_event_room_summary"
            referencedColumns: ["type_id"]
          },
        ]
      }
      v_insights_dashboard: {
        Row: {
          active_pages: number | null
          agency_id: string | null
          created_at: string | null
          event_id: string | null
          event_name: string | null
          form_responses: number | null
          latest_ai_summary: string | null
          latest_metrics: Json | null
          latest_recommendations: Json | null
          messages_sent: number | null
          participants_count: number | null
          updated_at: string | null
        }
        Insert: {
          active_pages?: never
          agency_id?: string | null
          created_at?: string | null
          event_id?: string | null
          event_name?: string | null
          form_responses?: never
          latest_ai_summary?: never
          latest_metrics?: never
          latest_recommendations?: never
          messages_sent?: never
          participants_count?: never
          updated_at?: string | null
        }
        Update: {
          active_pages?: never
          agency_id?: string | null
          created_at?: string | null
          event_id?: string | null
          event_name?: string | null
          form_responses?: never
          latest_ai_summary?: never
          latest_metrics?: never
          latest_recommendations?: never
          messages_sent?: never
          participants_count?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_performance_summary"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "dashboard_metrics"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "v_master_operations"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      v_master_operations: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          completed_events: number | null
          last_update: string | null
          manager_count: number | null
          ongoing_events: number | null
          total_events: number | null
        }
        Relationships: []
      }
      v_master_users: {
        Row: {
          active: boolean | null
          agency: string | null
          id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_staff_performance: {
        Row: {
          agency_id: string | null
          completed_events: number | null
          email: string | null
          last_update: string | null
          ongoing_events: number | null
          staff_id: string | null
          staff_name: string | null
          total_events: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "master_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_master_role: { Args: { user_email: string }; Returns: Json }
      cleanup_old_cache: { Args: never; Returns: undefined }
      create_agency: {
        Args: {
          p_contact_email: string
          p_manager_name: string
          p_name: string
        }
        Returns: Json
      }
      create_event_with_hotel:
        | {
            Args: {
              p_agency_id?: string
              p_created_by?: string
              p_end_date: string
              p_hotel_id?: string
              p_manager_id?: string
              p_name: string
              p_room_types?: Json
              p_start_date: string
              p_status?: string
              p_title: string
            }
            Returns: string
          }
        | {
            Args: {
              p_created_by?: string
              p_end_date: string
              p_hotel_id?: string
              p_name: string
              p_room_types?: Json
              p_start_date: string
              p_status?: string
              p_title: string
            }
            Returns: string
          }
      ensure_default_room_types: {
        Args: { p_brand?: string; p_hotel: string }
        Returns: undefined
      }
      fn_generate_qa_report: { Args: never; Returns: Json }
      fn_healthcheck_all: { Args: never; Returns: Json }
      fn_manage_user_account:
        | {
            Args: {
              p_action: string
              p_agency_id?: string
              p_email?: string
              p_role?: string
              p_user_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_action?: string
              p_agency_id?: string
              p_email?: string
              p_role?: string
              p_user_id?: string
            }
            Returns: Json
          }
      generate_weekly_ops_reports: { Args: never; Returns: undefined }
      get_agencies_by_member: {
        Args: { keyword: string }
        Returns: {
          id: string
          member_id: string
          member_name: string
          name: string
        }[]
      }
      get_agencies_list: {
        Args: never
        Returns: {
          code: string
          contact_email: string
          contact_name: string
          created_at: string
          event_count: number
          id: string
          is_active: boolean
          member_count: number
          name: string
        }[]
      }
      get_agency_performance_with_score: {
        Args: never
        Returns: {
          agency_id: string
          agency_name: string
          ai_usage_rate: number
          last_activity: string
          message_success_rate: number
          performance_score: number
          risk_level: string
          total_events: number
          total_logs: number
        }[]
      }
      get_cached_data: {
        Args: { _key: string; _ttl_seconds?: number }
        Returns: Json
      }
      get_deployment_health_summary: {
        Args: never
        Returns: {
          avg_duration_seconds: number
          failed_deployments: number
          last_deployment_status: string
          last_deployment_time: string
          last_deployment_version: string
          success_rate: number
          successful_deployments: number
          total_deployments: number
        }[]
      }
      get_event_analytics: {
        Args: { p_end_date?: string; p_event_id: string; p_start_date?: string }
        Returns: Json
      }
      get_event_rooming_info: {
        Args: { event_uuid: string }
        Returns: {
          default_credit: number
          hotel_city: string
          hotel_id: string
          hotel_name: string
          room_credit: string
          room_type_id: string
          type_name: string
        }[]
      }
      get_flow_forecast: {
        Args: { event: string }
        Returns: {
          avg_progress: number
          estimated_completion: string
          recent_speed: number
          risk_level: string
        }[]
      }
      get_health_check_summary: {
        Args: never
        Returns: {
          ai_success_rate: number
          edge_latency_ms: number
          issues_count: number
          last_check_time: string
          overall_status: string
          storage_usage_percent: number
          supabase_status: string
        }[]
      }
      get_hotels_by_keyword: {
        Args: { keyword: string }
        Returns: {
          brand: string
          city: string
          id: string
          name: string
          rating: number
        }[]
      }
      get_hotels_cached: { Args: { search_keyword: string }; Returns: Json }
      get_hotels_prefetch: {
        Args: never
        Returns: {
          brand: string
          city: string
          id: string
          name: string
          rating: number
        }[]
      }
      get_invitation_list: {
        Args: never
        Returns: {
          agency_id: string
          agency_name: string
          created_at: string
          created_by: string
          creator_email: string
          email: string
          expires_at: string
          id: string
          invite_token: string
          invite_url: string
          is_expired: boolean
          is_used: boolean
          revoked_at: string
          role: string
          used_at: string
        }[]
      }
      get_latest_daily_summary: {
        Args: { p_event_id: string }
        Returns: {
          created_at: string
          event_id: string
          id: string
          key_points_json: Json
          statistics: Json
          summary_text: string
          updated_at: string
        }[]
      }
      get_latest_declaration: { Args: never; Returns: Json }
      get_qa_checklist_summary: {
        Args: never
        Returns: {
          completed_items: number
          completion_rate: number
          failed_items: number
          module: string
          pending_items: number
          phase_id: string
          total_items: number
        }[]
      }
      get_recent_changes: {
        Args: { p_event_id: string; p_limit?: number; p_table_name?: string }
        Returns: {
          action: string
          created_at: string
          diff: Json
          id: string
          record_id: string
          table_name: string
          user_id: string
        }[]
      }
      get_recent_deployments: {
        Args: { p_limit?: number }
        Returns: {
          completed_at: string
          deployed_at: string
          deployer: string
          deployment_type: string
          duration_seconds: number
          id: string
          notes: string
          status: string
          version: string
        }[]
      }
      get_room_types: {
        Args: { p_hotel: string }
        Returns: {
          agency_id: string | null
          created_at: string | null
          default_credit: number | null
          description: string | null
          hotel_id: string | null
          id: string
          is_active: boolean | null
          source: string | null
          type_name: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "room_types"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_room_types_by_hotel:
        | {
            Args: { hotel_id_text: string }
            Returns: {
              default_credit: number
              description: string
              hotel_id: string
              id: string
              type_name: string
            }[]
          }
        | {
            Args: { hotel_uuid: string }
            Returns: {
              default_credit: number
              description: string
              hotel_id: string
              id: string
              type_name: string
            }[]
          }
      get_user_role: {
        Args: { uid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_users_by_keyword: {
        Args: { keyword: string }
        Returns: {
          agency_id: string
          agency_name: string
          email: string
          full_name: string
          id: string
        }[]
      }
      get_users_list: {
        Args: never
        Returns: {
          agency_id: string
          agency_name: string
          created_at: string
          display_name: string
          email: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
        }[]
      }
      get_vendor_performance_summary: {
        Args: { p_event_id?: string }
        Returns: {
          avg_cooperation: number
          avg_cost_effectiveness: number
          avg_quality: number
          avg_responsiveness: number
          avg_score: number
          total_evaluations: number
          vendor_id: string
          vendor_name: string
        }[]
      }
      has_event_access: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      has_event_role: {
        Args: {
          _event_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_min_role: {
        Args: {
          _min_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_agency_user: {
        Args: { p_agency_id: string; p_email: string; p_role?: string }
        Returns: Json
      }
      invite_master_user: {
        Args: { p_agency_id: string; p_email: string }
        Returns: Json
      }
      log_policy_test: {
        Args: {
          _action: string
          _result: boolean
          _table: string
          _user: string
        }
        Returns: undefined
      }
      master_post_announcement: {
        Args: { p_agency: string; p_body: string; p_title: string }
        Returns: undefined
      }
      master_revoke_invite: { Args: { p_token: string }; Returns: undefined }
      master_rotate_api_key: {
        Args: { p_agency: string }
        Returns: {
          api_key: string
        }[]
      }
      master_set_role: {
        Args: { p_role: string; p_user: string }
        Returns: undefined
      }
      master_toggle_agency_active: {
        Args: { p_agency: string }
        Returns: {
          agency_id: string
          is_active: boolean
        }[]
      }
      normalize_korean: { Args: { text_input: string }; Returns: string }
      normalize_role_type: { Args: { input_role: string }; Returns: string }
      ops_execute: {
        Args: { _payload?: Json; _playbook_key: string; _trigger: string }
        Returns: string
      }
      refresh_cache: {
        Args: { _key: string; _payload: Json }
        Returns: undefined
      }
      refresh_dashboard_metrics: { Args: never; Returns: undefined }
      rpc_activate_account: { Args: { token: string }; Returns: Json }
      rpc_create_agency: {
        Args: {
          p_contact_email: string
          p_contact_name: string
          p_name: string
        }
        Returns: Json
      }
      rpc_generate_module_insights: {
        Args: { p_agency_id?: string; p_module: string }
        Returns: Json
      }
      rpc_get_hotel_room_types: {
        Args: { p_event_id: string }
        Returns: {
          color_code: string
          hotel_id: string
          hotel_name: string
          id: string
          room_type_category: string
          room_type_name: string
          source: string
        }[]
      }
      rpc_get_master_account_summary: { Args: never; Returns: Json }
      rpc_get_merged_room_types: {
        Args: { p_agency_id: string; p_event_id: string }
        Returns: {
          color_code: string
          hotel_name: string
          id: string
          room_type_category: string
          room_type_name: string
          source: string
        }[]
      }
      rpc_invite_user: {
        Args: { p_agency_id: string; p_email: string; p_role: string }
        Returns: Json
      }
      rpc_revoke_invite_token: { Args: { p_token: string }; Returns: Json }
      rpc_sync_form_responses: { Args: { event_uuid: string }; Returns: Json }
      rpc_toggle_user_active: {
        Args: { target_user_id: string }
        Returns: Json
      }
      rpc_update_user_role: {
        Args: {
          new_agency_id?: string
          new_role: string
          target_user_id: string
        }
        Returns: Json
      }
      search_hotels: {
        Args: { query: string }
        Returns: {
          brand: string
          city: string
          id: string
          name: string
          rating: number
          source: string
        }[]
      }
      set_staff_role: {
        Args: { new_role: string; p_user: string }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sync_master_role: { Args: { _user_id: string }; Returns: undefined }
      sync_user_roles: { Args: never; Returns: undefined }
      transfer_agency_owner: {
        Args: { from_user: string; to_user: string }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      update_event_with_hotel:
        | {
            Args: {
              p_agency_id?: string
              p_end_date: string
              p_event_id: string
              p_hotel_id?: string
              p_manager_id?: string
              p_name: string
              p_room_types?: Json
              p_start_date: string
              p_status?: string
              p_title: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_end_date: string
              p_event_id: string
              p_hotel_id?: string
              p_name: string
              p_room_types?: Json
              p_start_date: string
              p_status?: string
              p_title: string
            }
            Returns: boolean
          }
      upsert_hotels_v1: { Args: { payload: Json }; Returns: number }
    }
    Enums: {
      ai_agent_role: "insight" | "analysis" | "advisor" | "visual"
      app_role:
        | "master"
        | "agency_owner"
        | "admin"
        | "staff"
        | "viewer"
        | "guest"
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
      ai_agent_role: ["insight", "analysis", "advisor", "visual"],
      app_role: ["master", "agency_owner", "admin", "staff", "viewer", "guest"],
    },
  },
} as const
