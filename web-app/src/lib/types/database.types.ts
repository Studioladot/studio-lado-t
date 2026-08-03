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
      activity_log: {
        Row: {
          action: string | null
          created_at: string | null
          detail: Json | null
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          detail?: Json | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          detail?: Json | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ad_analysis_snapshots: {
        Row: {
          ad_id: string
          ad_name: string | null
          atc: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          ic: number | null
          id: string
          p100: number | null
          p25: number | null
          p75: number | null
          purchases: number | null
          roas: number | null
          spend: number | null
          user_id: string
        }
        Insert: {
          ad_id: string
          ad_name?: string | null
          atc?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          ic?: number | null
          id?: string
          p100?: number | null
          p25?: number | null
          p75?: number | null
          purchases?: number | null
          roas?: number | null
          spend?: number | null
          user_id: string
        }
        Update: {
          ad_id?: string
          ad_name?: string | null
          atc?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          ic?: number | null
          id?: string
          p100?: number | null
          p25?: number | null
          p75?: number | null
          purchases?: number | null
          roas?: number | null
          spend?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ad_creative_notes: {
        Row: {
          ad_id: string
          angle: string | null
          created_at: string | null
          cta: string | null
          guion: string | null
          hook: string | null
          id: string
          porque_funciono: string | null
          porque_no_funciono: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ad_id: string
          angle?: string | null
          created_at?: string | null
          cta?: string | null
          guion?: string | null
          hook?: string | null
          id?: string
          porque_funciono?: string | null
          porque_no_funciono?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ad_id?: string
          angle?: string | null
          created_at?: string | null
          cta?: string | null
          guion?: string | null
          hook?: string | null
          id?: string
          porque_funciono?: string | null
          porque_no_funciono?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ad_product_links: {
        Row: {
          ad_id: string
          ad_name: string
          created_at: string
          id: number
          product_name: string | null
          tn_product_id: string
          tn_variant_id: string | null
          user_id: string
          variant_name: string | null
        }
        Insert: {
          ad_id: string
          ad_name: string
          created_at?: string
          id?: number
          product_name?: string | null
          tn_product_id: string
          tn_variant_id?: string | null
          user_id: string
          variant_name?: string | null
        }
        Update: {
          ad_id?: string
          ad_name?: string
          created_at?: string
          id?: number
          product_name?: string | null
          tn_product_id?: string
          tn_variant_id?: string | null
          user_id?: string
          variant_name?: string | null
        }
        Relationships: []
      }
      ad_script_links: {
        Row: {
          ad_id: string
          ad_name: string | null
          campaign_id: string | null
          campaign_name: string | null
          created_at: string | null
          id: string
          script_id: string | null
          script_title: string | null
          user_id: string
        }
        Insert: {
          ad_id: string
          ad_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          created_at?: string | null
          id?: string
          script_id?: string | null
          script_title?: string | null
          user_id: string
        }
        Update: {
          ad_id?: string
          ad_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          created_at?: string | null
          id?: string
          script_id?: string | null
          script_title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ad_variant_links: {
        Row: {
          ad_id: string
          created_at: string
          id: number
          tn_product_id: string
          tn_variant_id: string
          user_id: string
          variant_name: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: number
          tn_product_id: string
          tn_variant_id: string
          user_id: string
          variant_name?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: number
          tn_product_id?: string
          tn_variant_id?: string
          user_id?: string
          variant_name?: string | null
        }
        Relationships: []
      }
      ads: {
        Row: {
          data: Json
          id: string
          organization_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          data: Json
          id: string
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          data?: Json
          id?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      an_costos_adicionales: {
        Row: {
          concepto: string
          created_at: string | null
          id: string
          monto: number | null
          user_id: string
        }
        Insert: {
          concepto: string
          created_at?: string | null
          id?: string
          monto?: number | null
          user_id: string
        }
        Update: {
          concepto?: string
          created_at?: string | null
          id?: string
          monto?: number | null
          user_id?: string
        }
        Relationships: []
      }
      autopilot_custom_rules: {
        Row: {
          action: string
          active: boolean
          campaign_id: string | null
          conditions: Json
          created_at: string
          created_by: string | null
          id: string
          min_spend: number
          name: string
          organization_id: string
          params: Json
          window_days: number
        }
        Insert: {
          action: string
          active?: boolean
          campaign_id?: string | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          min_spend?: number
          name: string
          organization_id: string
          params?: Json
          window_days?: number
        }
        Update: {
          action?: string
          active?: boolean
          campaign_id?: string | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          min_spend?: number
          name?: string
          organization_id?: string
          params?: Json
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_custom_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_log: {
        Row: {
          action: string
          ad_id: string | null
          ad_name: string | null
          created_at: string
          id: number
          message: string
          rule_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          ad_id?: string | null
          ad_name?: string | null
          created_at?: string
          id?: number
          message: string
          rule_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          ad_id?: string | null
          ad_name?: string | null
          created_at?: string
          id?: number
          message?: string
          rule_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      autopilot_playbook_settings: {
        Row: {
          campaign_id: string
          enabled: boolean
          id: string
          organization_id: string
          params: Json
          playbook_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          campaign_id: string
          enabled?: boolean
          id?: string
          organization_id: string
          params?: Json
          playbook_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          campaign_id?: string
          enabled?: boolean
          id?: string
          organization_id?: string
          params?: Json
          playbook_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_playbook_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_rules: {
        Row: {
          action: string
          active: boolean
          conditions: Json
          created_at: string
          id: string
          min_spend: number
          name: string
          user_id: string
          window_days: number
        }
        Insert: {
          action?: string
          active?: boolean
          conditions?: Json
          created_at?: string
          id: string
          min_spend?: number
          name: string
          user_id: string
          window_days?: number
        }
        Update: {
          action?: string
          active?: boolean
          conditions?: Json
          created_at?: string
          id?: string
          min_spend?: number
          name?: string
          user_id?: string
          window_days?: number
        }
        Relationships: []
      }
      autopilot_run_log: {
        Row: {
          action: string
          campaign_id: string
          campaign_name: string | null
          created_at: string
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          message: string
          organization_id: string
          playbook_type: string | null
          rule_id: string | null
        }
        Insert: {
          action: string
          campaign_id: string
          campaign_name?: string | null
          created_at?: string
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          message: string
          organization_id: string
          playbook_type?: string | null
          rule_id?: string | null
        }
        Update: {
          action?: string
          campaign_id?: string
          campaign_name?: string | null
          created_at?: string
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          message?: string
          organization_id?: string
          playbook_type?: string | null
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_run_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_run_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "autopilot_custom_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_journal_entries: {
        Row: {
          created_at: string
          id: string
          month: string
          narrative: string
          organization_id: string
          stats: Json
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          narrative: string
          organization_id: string
          stats?: Json
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          narrative?: string
          organization_id?: string
          stats?: Json
        }
        Relationships: [
          {
            foreignKeyName: "brand_journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profile: {
        Row: {
          brand_name: string | null
          breakeven_roas: number | null
          experto1_nombre: string | null
          experto1_rol: string | null
          experto2_nombre: string | null
          experto2_rol: string | null
          margen_bruto_objetivo: number | null
          notas_libres: string | null
          organization_id: string | null
          rubro: string | null
          tono: string | null
          ubicacion: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_name?: string | null
          breakeven_roas?: number | null
          experto1_nombre?: string | null
          experto1_rol?: string | null
          experto2_nombre?: string | null
          experto2_rol?: string | null
          margen_bruto_objetivo?: number | null
          notas_libres?: string | null
          organization_id?: string | null
          rubro?: string | null
          tono?: string | null
          ubicacion?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_name?: string | null
          breakeven_roas?: number | null
          experto1_nombre?: string | null
          experto1_rol?: string | null
          experto2_nombre?: string | null
          experto2_rol?: string | null
          margen_bruto_objetivo?: number | null
          notas_libres?: string | null
          organization_id?: string | null
          rubro?: string | null
          tono?: string | null
          ubicacion?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_profile_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_presets: {
        Row: {
          advantage_controls: Json
          autopilot_rule_ids: string[]
          campaign: Json
          created_at: string
          id: string
          name: string
          organization_id: string | null
          targeting: Json
          url_producto: string | null
          user_id: string
        }
        Insert: {
          advantage_controls?: Json
          autopilot_rule_ids?: string[]
          campaign?: Json
          created_at?: string
          id: string
          name: string
          organization_id?: string | null
          targeting?: Json
          url_producto?: string | null
          user_id: string
        }
        Update: {
          advantage_controls?: Json
          autopilot_rule_ids?: string[]
          campaign?: Json
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          targeting?: Json
          url_producto?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_presets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_targets: {
        Row: {
          breakeven_cpa: number | null
          breakeven_roas: number | null
          campaign_id: string | null
          id: string
          organization_id: string
          target_cpa: number | null
          target_roas: number | null
          unit_economics: Json | null
          updated_at: string
        }
        Insert: {
          breakeven_cpa?: number | null
          breakeven_roas?: number | null
          campaign_id?: string | null
          id?: string
          organization_id: string
          target_cpa?: number | null
          target_roas?: number | null
          unit_economics?: Json | null
          updated_at?: string
        }
        Update: {
          breakeven_cpa?: number | null
          breakeven_roas?: number | null
          campaign_id?: string | null
          id?: string
          organization_id?: string
          target_cpa?: number | null
          target_roas?: number | null
          unit_economics?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_targets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      card_order: {
        Row: {
          card_ids: Json
          grid_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_ids: Json
          grid_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_ids?: Json
          grid_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          brand: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          service: string | null
          stage: string | null
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          service?: string | null
          stage?: string | null
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          service?: string | null
          stage?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_campaigns: {
        Row: {
          color: string | null
          concepto_creativo: string | null
          concepto_estrategico: string | null
          created_at: string | null
          desarrollo: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          formatos: Json | null
          id: string
          nombre: string
          notas: string | null
          objetivo: string | null
          organization_id: string | null
          periodo: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          concepto_creativo?: string | null
          concepto_estrategico?: string | null
          created_at?: string | null
          desarrollo?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          formatos?: Json | null
          id?: string
          nombre: string
          notas?: string | null
          objetivo?: string | null
          organization_id?: string | null
          periodo?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          concepto_creativo?: string | null
          concepto_estrategico?: string | null
          created_at?: string | null
          desarrollo?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          formatos?: Json | null
          id?: string
          nombre?: string
          notas?: string | null
          objetivo?: string | null
          organization_id?: string | null
          periodo?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_ideas: {
        Row: {
          angulo: string | null
          created_at: string | null
          formato: string | null
          hook: string | null
          id: string
          idea: string
          organization_id: string | null
          usado: boolean | null
          user_id: string
        }
        Insert: {
          angulo?: string | null
          created_at?: string | null
          formato?: string | null
          hook?: string | null
          id?: string
          idea: string
          organization_id?: string | null
          usado?: boolean | null
          user_id: string
        }
        Update: {
          angulo?: string | null
          created_at?: string | null
          formato?: string | null
          hook?: string | null
          id?: string
          idea?: string
          organization_id?: string | null
          usado?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_ideas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_piezas: {
        Row: {
          campaign_id: string
          caption: string | null
          created_at: string | null
          fecha_planificada: string | null
          formato: string | null
          id: string
          ig_container_id: string | null
          ig_media_id: string | null
          ig_permalink: string | null
          media_type: string | null
          media_url: string | null
          media_urls: Json | null
          notas: string | null
          organization_id: string | null
          plataforma: string | null
          production_status: string
          protagonista: string | null
          publish_error: string | null
          publish_status: string
          published_at: string | null
          reference_urls: Json
          retry_count: number
          scheduled_at: string | null
          status: string | null
          tiktok_caption: string | null
          tiktok_container_id: string | null
          tiktok_media_id: string | null
          tiktok_permalink: string | null
          tiktok_publish_error: string | null
          tiktok_publish_status: string
          tiktok_published_at: string | null
          tiktok_retry_count: number
          tiktok_scheduled_at: string | null
          titulo: string
          turno: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          caption?: string | null
          created_at?: string | null
          fecha_planificada?: string | null
          formato?: string | null
          id?: string
          ig_container_id?: string | null
          ig_media_id?: string | null
          ig_permalink?: string | null
          media_type?: string | null
          media_url?: string | null
          media_urls?: Json | null
          notas?: string | null
          organization_id?: string | null
          plataforma?: string | null
          production_status?: string
          protagonista?: string | null
          publish_error?: string | null
          publish_status?: string
          published_at?: string | null
          reference_urls?: Json
          retry_count?: number
          scheduled_at?: string | null
          status?: string | null
          tiktok_caption?: string | null
          tiktok_container_id?: string | null
          tiktok_media_id?: string | null
          tiktok_permalink?: string | null
          tiktok_publish_error?: string | null
          tiktok_publish_status?: string
          tiktok_published_at?: string | null
          tiktok_retry_count?: number
          tiktok_scheduled_at?: string | null
          titulo: string
          turno?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          caption?: string | null
          created_at?: string | null
          fecha_planificada?: string | null
          formato?: string | null
          id?: string
          ig_container_id?: string | null
          ig_media_id?: string | null
          ig_permalink?: string | null
          media_type?: string | null
          media_url?: string | null
          media_urls?: Json | null
          notas?: string | null
          organization_id?: string | null
          plataforma?: string | null
          production_status?: string
          protagonista?: string | null
          publish_error?: string | null
          publish_status?: string
          published_at?: string | null
          reference_urls?: Json
          retry_count?: number
          scheduled_at?: string | null
          status?: string | null
          tiktok_caption?: string | null
          tiktok_container_id?: string | null
          tiktok_media_id?: string | null
          tiktok_permalink?: string | null
          tiktok_publish_error?: string | null
          tiktok_publish_status?: string
          tiktok_published_at?: string | null
          tiktok_retry_count?: number
          tiktok_scheduled_at?: string | null
          titulo?: string
          turno?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_piezas_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "content_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_piezas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_posts: {
        Row: {
          caption: string | null
          created_at: string | null
          date: string | null
          format: string | null
          id: string
          ig_container_id: string | null
          ig_media_id: string | null
          ig_permalink: string | null
          media_type: string | null
          media_url: string | null
          media_urls: Json | null
          notes: string | null
          organization_id: string | null
          platform: string | null
          production_status: string
          protagonista: string | null
          publish_error: string | null
          publish_status: string
          published_at: string | null
          reference_urls: Json
          retry_count: number
          scheduled_at: string | null
          status: string | null
          tiktok_caption: string | null
          tiktok_container_id: string | null
          tiktok_media_id: string | null
          tiktok_permalink: string | null
          tiktok_publish_error: string | null
          tiktok_publish_status: string
          tiktok_published_at: string | null
          tiktok_retry_count: number
          tiktok_scheduled_at: string | null
          title: string | null
          turno: string | null
          user_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          date?: string | null
          format?: string | null
          id?: string
          ig_container_id?: string | null
          ig_media_id?: string | null
          ig_permalink?: string | null
          media_type?: string | null
          media_url?: string | null
          media_urls?: Json | null
          notes?: string | null
          organization_id?: string | null
          platform?: string | null
          production_status?: string
          protagonista?: string | null
          publish_error?: string | null
          publish_status?: string
          published_at?: string | null
          reference_urls?: Json
          retry_count?: number
          scheduled_at?: string | null
          status?: string | null
          tiktok_caption?: string | null
          tiktok_container_id?: string | null
          tiktok_media_id?: string | null
          tiktok_permalink?: string | null
          tiktok_publish_error?: string | null
          tiktok_publish_status?: string
          tiktok_published_at?: string | null
          tiktok_retry_count?: number
          tiktok_scheduled_at?: string | null
          title?: string | null
          turno?: string | null
          user_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          date?: string | null
          format?: string | null
          id?: string
          ig_container_id?: string | null
          ig_media_id?: string | null
          ig_permalink?: string | null
          media_type?: string | null
          media_url?: string | null
          media_urls?: Json | null
          notes?: string | null
          organization_id?: string | null
          platform?: string | null
          production_status?: string
          protagonista?: string | null
          publish_error?: string | null
          publish_status?: string
          published_at?: string | null
          reference_urls?: Json
          retry_count?: number
          scheduled_at?: string | null
          status?: string | null
          tiktok_caption?: string | null
          tiktok_container_id?: string | null
          tiktok_media_id?: string | null
          tiktok_permalink?: string | null
          tiktok_publish_error?: string | null
          tiktok_publish_status?: string
          tiktok_published_at?: string | null
          tiktok_retry_count?: number
          tiktok_scheduled_at?: string | null
          title?: string | null
          turno?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          comments: number | null
          date: string | null
          duration: string | null
          followers_gained: number | null
          hook: string | null
          id: string
          likes: number | null
          notes: string | null
          organization_id: string | null
          platform: string | null
          saves: number | null
          shares: number | null
          title: string | null
          type: string | null
          updated_at: string | null
          user_id: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          date?: string | null
          duration?: string | null
          followers_gained?: number | null
          hook?: string | null
          id: string
          likes?: number | null
          notes?: string | null
          organization_id?: string | null
          platform?: string | null
          saves?: number | null
          shares?: number | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          date?: string | null
          duration?: string | null
          followers_gained?: number | null
          hook?: string | null
          id?: string
          likes?: number | null
          notes?: string | null
          organization_id?: string | null
          platform?: string | null
          saves?: number | null
          shares?: number | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          company: string | null
          date: string | null
          email: string | null
          id: string
          name: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          stage: string | null
          updated_at: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          company?: string | null
          date?: string | null
          email?: string | null
          id: string
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          stage?: string | null
          updated_at?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          company?: string | null
          date?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          stage?: string | null
          updated_at?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_deletion_requests: {
        Row: {
          completed_at: string | null
          confirmation_code: string
          fb_user_id: string
          id: string
          requested_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          confirmation_code: string
          fb_user_id: string
          id?: string
          requested_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          confirmation_code?: string
          fb_user_id?: string
          id?: string
          requested_at?: string
          status?: string
        }
        Relationships: []
      }
      daily_sales: {
        Row: {
          canal: string | null
          costo_unitario: number | null
          created_at: string | null
          fecha: string
          id: string
          monto: number | null
          notas: string | null
          organization_id: string | null
          tn_product_id: string | null
          tn_variant_id: string | null
          unidades: number | null
          user_id: string
        }
        Insert: {
          canal?: string | null
          costo_unitario?: number | null
          created_at?: string | null
          fecha?: string
          id?: string
          monto?: number | null
          notas?: string | null
          organization_id?: string | null
          tn_product_id?: string | null
          tn_variant_id?: string | null
          unidades?: number | null
          user_id: string
        }
        Update: {
          canal?: string | null
          costo_unitario?: number | null
          created_at?: string | null
          fecha?: string
          id?: string
          monto?: number | null
          notas?: string | null
          organization_id?: string | null
          tn_product_id?: string | null
          tn_variant_id?: string | null
          unidades?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          page: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          page?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          page?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          categoria: string | null
          created_at: string | null
          dia_vencimiento: number | null
          id: string
          monto: number | null
          nombre: string
          notas: string | null
          organization_id: string | null
          pagado: boolean | null
          tipo: string | null
          user_id: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          dia_vencimiento?: number | null
          id?: string
          monto?: number | null
          nombre: string
          notas?: string | null
          organization_id?: string | null
          pagado?: boolean | null
          tipo?: string | null
          user_id: string
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          dia_vencimiento?: number | null
          id?: string
          monto?: number | null
          nombre?: string
          notas?: string | null
          organization_id?: string | null
          pagado?: boolean | null
          tipo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_config: {
        Row: {
          comision_tn_pct: number | null
          costo_envio_promedio: number | null
          costos_adicionales_manual: number | null
          dias_operativos: number | null
          id: string
          impuestos_pct: number | null
          margen_bruto: number | null
          meta_moneda: string | null
          objetivo_ganancia_pct: number | null
          organization_id: string | null
          pasarela_pct: number | null
          presupuesto_ads_mensual: number | null
          usd_manual: number | null
          user_id: string
        }
        Insert: {
          comision_tn_pct?: number | null
          costo_envio_promedio?: number | null
          costos_adicionales_manual?: number | null
          dias_operativos?: number | null
          id?: string
          impuestos_pct?: number | null
          margen_bruto?: number | null
          meta_moneda?: string | null
          objetivo_ganancia_pct?: number | null
          organization_id?: string | null
          pasarela_pct?: number | null
          presupuesto_ads_mensual?: number | null
          usd_manual?: number | null
          user_id: string
        }
        Update: {
          comision_tn_pct?: number | null
          costo_envio_promedio?: number | null
          costos_adicionales_manual?: number | null
          dias_operativos?: number | null
          id?: string
          impuestos_pct?: number | null
          margen_bruto?: number | null
          meta_moneda?: string | null
          objetivo_ganancia_pct?: number | null
          organization_id?: string | null
          pasarela_pct?: number | null
          presupuesto_ads_mensual?: number | null
          usd_manual?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finances: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          organization_id: string | null
          product: string | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id: string
          organization_id?: string | null
          product?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          product?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_chat_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_conversations: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_knowledge: {
        Row: {
          categoria: string | null
          created_at: string | null
          id: string
          regla: string
          user_id: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          id?: string
          regla: string
          user_id?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          id?: string
          regla?: string
          user_id?: string | null
        }
        Relationships: []
      }
      instagram_account_insights: {
        Row: {
          captured_at: string
          follower_count: number | null
          id: string
          impressions: number | null
          organization_id: string
          profile_views: number | null
          reach: number | null
          total_interactions: number | null
        }
        Insert: {
          captured_at?: string
          follower_count?: number | null
          id?: string
          impressions?: number | null
          organization_id: string
          profile_views?: number | null
          reach?: number | null
          total_interactions?: number | null
        }
        Update: {
          captured_at?: string
          follower_count?: number | null
          id?: string
          impressions?: number | null
          organization_id?: string
          profile_views?: number | null
          reach?: number | null
          total_interactions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_account_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_connections: {
        Row: {
          connected_at: string
          fb_user_id: string | null
          id: string
          ig_user_id: string
          ig_username: string | null
          media_sync_complete: boolean
          media_sync_cursor: string | null
          organization_id: string
          page_access_token: string
          page_id: string
          page_name: string | null
          profile_picture_url: string | null
        }
        Insert: {
          connected_at?: string
          fb_user_id?: string | null
          id?: string
          ig_user_id: string
          ig_username?: string | null
          media_sync_complete?: boolean
          media_sync_cursor?: string | null
          organization_id: string
          page_access_token: string
          page_id: string
          page_name?: string | null
          profile_picture_url?: string | null
        }
        Update: {
          connected_at?: string
          fb_user_id?: string | null
          id?: string
          ig_user_id?: string
          ig_username?: string | null
          media_sync_complete?: boolean
          media_sync_cursor?: string | null
          organization_id?: string
          page_access_token?: string
          page_id?: string
          page_name?: string | null
          profile_picture_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_media_catalog: {
        Row: {
          attributed_sales: number | null
          caption: string | null
          comments_count: number | null
          created_at: string
          id: string
          ig_media_id: string
          impressions: number | null
          like_count: number | null
          link_clicks: number | null
          media_product_type: string | null
          media_type: string | null
          media_url: string | null
          organization_id: string
          permalink: string | null
          plays: number | null
          posted_at: string | null
          reach: number | null
          roas_organic: number | null
          saved: number | null
          shares: number | null
          synced_at: string
          thumbnail_url: string | null
        }
        Insert: {
          attributed_sales?: number | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          ig_media_id: string
          impressions?: number | null
          like_count?: number | null
          link_clicks?: number | null
          media_product_type?: string | null
          media_type?: string | null
          media_url?: string | null
          organization_id: string
          permalink?: string | null
          plays?: number | null
          posted_at?: string | null
          reach?: number | null
          roas_organic?: number | null
          saved?: number | null
          shares?: number | null
          synced_at?: string
          thumbnail_url?: string | null
        }
        Update: {
          attributed_sales?: number | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          ig_media_id?: string
          impressions?: number | null
          like_count?: number | null
          link_clicks?: number | null
          media_product_type?: string | null
          media_type?: string | null
          media_url?: string | null
          organization_id?: string
          permalink?: string | null
          plays?: number | null
          posted_at?: string | null
          reach?: number | null
          roas_organic?: number | null
          saved?: number | null
          shares?: number | null
          synced_at?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_media_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_media_insights: {
        Row: {
          captured_at: string
          comments: number | null
          id: string
          ig_media_id: string | null
          likes: number | null
          organization_id: string
          piece_id: string | null
          platform: string
          plays: number | null
          post_id: string | null
          reach: number | null
          saves: number | null
          shares: number | null
        }
        Insert: {
          captured_at?: string
          comments?: number | null
          id?: string
          ig_media_id?: string | null
          likes?: number | null
          organization_id: string
          piece_id?: string | null
          platform?: string
          plays?: number | null
          post_id?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
        }
        Update: {
          captured_at?: string
          comments?: number | null
          id?: string
          ig_media_id?: string | null
          likes?: number | null
          organization_id?: string
          piece_id?: string | null
          platform?: string
          plays?: number | null
          post_id?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_media_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_media_insights_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "content_piezas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_media_insights_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_activity_log: {
        Row: {
          campaign_id: string | null
          campaign_name: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          status: string
          steps: Json
        }
        Insert: {
          campaign_id?: string | null
          campaign_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          status: string
          steps?: Json
        }
        Update: {
          campaign_id?: string | null
          campaign_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          status?: string
          steps?: Json
        }
        Relationships: [
          {
            foreignKeyName: "launch_activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      library_creatives: {
        Row: {
          asset_type: string
          created_at: string
          created_by: string | null
          cta: string
          deployed_ad_id: string | null
          deployed_at: string | null
          file_url: string
          headline: string | null
          id: string
          meta_image_hash: string | null
          meta_video_id: string | null
          name: string
          organization_id: string
          primary_text: string | null
          source_script_id: string | null
          status: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          created_by?: string | null
          cta?: string
          deployed_ad_id?: string | null
          deployed_at?: string | null
          file_url: string
          headline?: string | null
          id?: string
          meta_image_hash?: string | null
          meta_video_id?: string | null
          name: string
          organization_id: string
          primary_text?: string | null
          source_script_id?: string | null
          status?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          created_by?: string | null
          cta?: string
          deployed_ad_id?: string | null
          deployed_at?: string | null
          file_url?: string
          headline?: string | null
          id?: string
          meta_image_hash?: string | null
          meta_video_id?: string | null
          name?: string
          organization_id?: string
          primary_text?: string | null
          source_script_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_creatives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_creatives_source_script_id_fkey"
            columns: ["source_script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_connections: {
        Row: {
          account_currency: string | null
          account_id: string
          account_name: string | null
          app_id: string | null
          created_at: string | null
          expires_at: string | null
          fb_user_id: string | null
          id: string
          organization_id: string | null
          token: string
          user_id: string
        }
        Insert: {
          account_currency?: string | null
          account_id: string
          account_name?: string | null
          app_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          fb_user_id?: string | null
          id?: string
          organization_id?: string | null
          token: string
          user_id: string
        }
        Update: {
          account_currency?: string | null
          account_id?: string
          account_name?: string | null
          app_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          fb_user_id?: string | null
          id?: string
          organization_id?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_snapshots: {
        Row: {
          account_id: string
          created_at: string | null
          data: Json
          date_start: string | null
          date_stop: string | null
          id: string
          level: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          data: Json
          date_start?: string | null
          date_stop?: string | null
          id?: string
          level?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          data?: Json
          date_start?: string | null
          date_stop?: string | null
          id?: string
          level?: string | null
          user_id?: string
        }
        Relationships: []
      }
      metric_benchmarks: {
        Row: {
          cpa_max: number | null
          cpm_max: number | null
          ctr_target: number | null
          freq_max: number | null
          hook_rate_target: number | null
          organization_id: string
          p100_target: number | null
          p25_target: number | null
          roas_min: number | null
          roas_target: number | null
          updated_at: string
        }
        Insert: {
          cpa_max?: number | null
          cpm_max?: number | null
          ctr_target?: number | null
          freq_max?: number | null
          hook_rate_target?: number | null
          organization_id: string
          p100_target?: number | null
          p25_target?: number | null
          roas_min?: number | null
          roas_target?: number | null
          updated_at?: string
        }
        Update: {
          cpa_max?: number | null
          cpm_max?: number | null
          ctr_target?: number | null
          freq_max?: number | null
          hook_rate_target?: number | null
          organization_id?: string
          p100_target?: number | null
          p25_target?: number | null
          roas_min?: number | null
          roas_target?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_benchmarks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          atc: number | null
          campaign: string | null
          cpa: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          date: string | null
          frequency: number | null
          hook_rate: number | null
          ic: number | null
          id: string
          meta_id: string | null
          name: string | null
          notes: string | null
          organization_id: string | null
          p100: number | null
          p25: number | null
          p75: number | null
          platform: string | null
          purchases: number | null
          range_key: string | null
          revenue: number | null
          roas: number | null
          snap_time: string | null
          snap_type: string | null
          snapshot_date: string | null
          spend: number | null
          user_id: string | null
        }
        Insert: {
          atc?: number | null
          campaign?: string | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string | null
          frequency?: number | null
          hook_rate?: number | null
          ic?: number | null
          id?: string
          meta_id?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          p100?: number | null
          p25?: number | null
          p75?: number | null
          platform?: string | null
          purchases?: number | null
          range_key?: string | null
          revenue?: number | null
          roas?: number | null
          snap_time?: string | null
          snap_type?: string | null
          snapshot_date?: string | null
          spend?: number | null
          user_id?: string | null
        }
        Update: {
          atc?: number | null
          campaign?: string | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string | null
          frequency?: number | null
          hook_rate?: number | null
          ic?: number | null
          id?: string
          meta_id?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          p100?: number | null
          p25?: number | null
          p75?: number | null
          platform?: string | null
          purchases?: number | null
          range_key?: string | null
          revenue?: number | null
          roas?: number | null
          snap_time?: string | null
          snap_type?: string | null
          snapshot_date?: string | null
          spend?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          categoria: string | null
          color: string | null
          contenido: string
          created_at: string | null
          id: string
          media_url: string | null
          organization_id: string | null
          titulo: string | null
          user_id: string
        }
        Insert: {
          categoria?: string | null
          color?: string | null
          contenido: string
          created_at?: string | null
          id?: string
          media_url?: string | null
          organization_id?: string | null
          titulo?: string | null
          user_id: string
        }
        Update: {
          categoria?: string | null
          color?: string | null
          contenido?: string
          created_at?: string | null
          id?: string
          media_url?: string | null
          organization_id?: string | null
          titulo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          organization_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          id: string
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objectives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_costs: {
        Row: {
          concepto: string
          created_at: string
          id: string
          monto: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          concepto: string
          created_at?: string
          id?: string
          monto?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          concepto?: string
          created_at?: string
          id?: string
          monto?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operating_costs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_notification_settings: {
        Row: {
          email: string | null
          enabled: boolean
          organization_id: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          email?: string | null
          enabled?: boolean
          organization_id: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          email?: string | null
          enabled?: boolean
          organization_id?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_notification_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_usage: {
        Row: {
          count: number | null
          created_at: string | null
          id: string
          metric_name: string
          organization_id: string | null
          window_start: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          id?: string
          metric_name: string
          organization_id?: string | null
          window_start?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          id?: string
          metric_name?: string
          organization_id?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          plan: string
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          plan?: string
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          plan?: string
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      payment_gateway_fees: {
        Row: {
          fee_pct: number | null
          gateway: string
          user_id: string
        }
        Insert: {
          fee_pct?: number | null
          gateway: string
          user_id: string
        }
        Update: {
          fee_pct?: number | null
          gateway?: string
          user_id?: string
        }
        Relationships: []
      }
      product_costs: {
        Row: {
          cost: number
          id: string
          organization_id: string
          product_name: string | null
          tn_product_id: number | null
          tn_variant_id: number
          updated_at: string
        }
        Insert: {
          cost?: number
          id?: string
          organization_id: string
          product_name?: string | null
          tn_product_id?: number | null
          tn_variant_id: number
          updated_at?: string
        }
        Update: {
          cost?: number
          id?: string
          organization_id?: string
          product_name?: string | null
          tn_product_id?: number | null
          tn_variant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          request_count: number | null
          route: string
          user_id: string
          window_start: string
        }
        Insert: {
          request_count?: number | null
          route?: string
          user_id: string
          window_start: string
        }
        Update: {
          request_count?: number | null
          route?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          angle: string | null
          body: string | null
          copy_feed: string | null
          cpa: number | null
          cta: string | null
          data: Json
          hook: string | null
          hook_rate: number | null
          id: string
          notes: string | null
          organization_id: string | null
          p100: number | null
          p25: number | null
          p75: number | null
          parent_guion_id: string | null
          product: string | null
          roas: number | null
          spend: number | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          angle?: string | null
          body?: string | null
          copy_feed?: string | null
          cpa?: number | null
          cta?: string | null
          data?: Json
          hook?: string | null
          hook_rate?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          p100?: number | null
          p25?: number | null
          p75?: number | null
          parent_guion_id?: string | null
          product?: string | null
          roas?: number | null
          spend?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          angle?: string | null
          body?: string | null
          copy_feed?: string | null
          cpa?: number | null
          cta?: string | null
          data?: Json
          hook?: string | null
          hook_rate?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          p100?: number | null
          p25?: number | null
          p75?: number | null
          parent_guion_id?: string | null
          product?: string | null
          roas?: number | null
          spend?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scripts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_parent_guion_id_fkey"
            columns: ["parent_guion_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_alerts: {
        Row: {
          campaign_id: string | null
          campaign_name: string | null
          created_at: string | null
          id: string
          purchases: number | null
          seen: boolean | null
          spend: number | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          campaign_name?: string | null
          created_at?: string | null
          id?: string
          purchases?: number | null
          seen?: boolean | null
          spend?: number | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          campaign_name?: string | null
          created_at?: string | null
          id?: string
          purchases?: number | null
          seen?: boolean | null
          spend?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string | null
          descripcion: string
          id: string
          pagina: string | null
          status: string | null
          ultimo_error_js: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion: string
          id?: string
          pagina?: string | null
          status?: string | null
          ultimo_error_js?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string
          id?: string
          pagina?: string | null
          status?: string | null
          ultimo_error_js?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          data: Json
          id: string
          organization_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          data: Json
          id: string
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          data?: Json
          id?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tiendanube_connections: {
        Row: {
          access_token: string
          connected_at: string | null
          id: string
          organization_id: string | null
          store_id: string
          store_name: string | null
          store_url: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          id?: string
          organization_id?: string | null
          store_id: string
          store_name?: string | null
          store_url?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          id?: string
          organization_id?: string | null
          store_id?: string
          store_name?: string | null
          store_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiendanube_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_connections: {
        Row: {
          access_token: string
          avatar_url: string | null
          connected_at: string
          expires_at: string
          id: string
          organization_id: string
          refresh_token: string
          tiktok_open_id: string
          tiktok_username: string | null
        }
        Insert: {
          access_token: string
          avatar_url?: string | null
          connected_at?: string
          expires_at: string
          id?: string
          organization_id: string
          refresh_token: string
          tiktok_open_id: string
          tiktok_username?: string | null
        }
        Update: {
          access_token?: string
          avatar_url?: string | null
          connected_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          refresh_token?: string
          tiktok_open_id?: string
          tiktok_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_videos: {
        Row: {
          attributed_sales: number | null
          comment_count: number
          cover_image_url: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          like_count: number
          link_clicks: number | null
          organization_id: string
          posted_at: string | null
          roas_organic: number | null
          share_count: number
          share_url: string | null
          synced_at: string
          tiktok_video_id: string
          video_download_url: string | null
          view_count: number
        }
        Insert: {
          attributed_sales?: number | null
          comment_count?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          like_count?: number
          link_clicks?: number | null
          organization_id: string
          posted_at?: string | null
          roas_organic?: number | null
          share_count?: number
          share_url?: string | null
          synced_at?: string
          tiktok_video_id: string
          video_download_url?: string | null
          view_count?: number
        }
        Update: {
          attributed_sales?: number | null
          comment_count?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          like_count?: number
          link_clicks?: number | null
          organization_id?: string
          posted_at?: string | null
          roas_organic?: number | null
          share_count?: number
          share_url?: string | null
          synced_at?: string
          tiktok_video_id?: string
          video_download_url?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_videos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tn_cache: {
        Row: {
          data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          data: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          data?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tn_orders_cache: {
        Row: {
          cache_key: string
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          cache_key: string
          data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          cache_key?: string
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tn_product_costs: {
        Row: {
          cost: number | null
          id: string
          product_id: number | null
          updated_at: string | null
          user_id: string
          variant_id: number
        }
        Insert: {
          cost?: number | null
          id?: string
          product_id?: number | null
          updated_at?: string | null
          user_id: string
          variant_id: number
        }
        Update: {
          cost?: number | null
          id?: string
          product_id?: number | null
          updated_at?: string | null
          user_id?: string
          variant_id?: number
        }
        Relationships: []
      }
      user_alert_settings: {
        Row: {
          spend_threshold: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          spend_threshold?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          spend_threshold?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string
          is_admin: boolean | null
          is_approved: boolean | null
          negocio: string | null
          nombre: string | null
          notas: string | null
          permissions: Json | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id: string
          is_admin?: boolean | null
          is_approved?: boolean | null
          negocio?: string | null
          nombre?: string | null
          notas?: string | null
          permissions?: Json | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          is_admin?: boolean | null
          is_approved?: boolean | null
          negocio?: string | null
          nombre?: string | null
          notas?: string | null
          permissions?: Json | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      users_data: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization_with_owner: {
        Args: { org_name: string }
        Returns: string
      }
      get_organization_members: {
        Args: { org_id: string }
        Returns: {
          email: string
          role: string
          user_id: string
        }[]
      }
      invite_member_by_email: {
        Args: { member_email: string; member_role?: string; org_id: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      remove_member: {
        Args: { org_id: string; target_user_id: string }
        Returns: Json
      }
      update_member_role: {
        Args: { new_role: string; org_id: string; target_user_id: string }
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
