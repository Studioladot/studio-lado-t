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
          created_at: string | null
          fecha_planificada: string | null
          formato: string | null
          id: string
          media_type: string | null
          media_url: string | null
          media_urls: Json | null
          notas: string | null
          organization_id: string | null
          plataforma: string | null
          protagonista: string | null
          status: string | null
          titulo: string
          turno: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          fecha_planificada?: string | null
          formato?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          media_urls?: Json | null
          notas?: string | null
          organization_id?: string | null
          plataforma?: string | null
          protagonista?: string | null
          status?: string | null
          titulo: string
          turno?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          fecha_planificada?: string | null
          formato?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          media_urls?: Json | null
          notas?: string | null
          organization_id?: string | null
          plataforma?: string | null
          protagonista?: string | null
          status?: string | null
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
          media_type: string | null
          media_url: string | null
          media_urls: Json | null
          notes: string | null
          organization_id: string | null
          platform: string | null
          protagonista: string | null
          status: string | null
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
          media_type?: string | null
          media_url?: string | null
          media_urls?: Json | null
          notes?: string | null
          organization_id?: string | null
          platform?: string | null
          protagonista?: string | null
          status?: string | null
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
          media_type?: string | null
          media_url?: string | null
          media_urls?: Json | null
          notes?: string | null
          organization_id?: string | null
          platform?: string | null
          protagonista?: string | null
          status?: string | null
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
          margen_bruto: number | null
          meta_moneda: string | null
          objetivo_ganancia_pct: number | null
          organization_id: string | null
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
          margen_bruto?: number | null
          meta_moneda?: string | null
          objetivo_ganancia_pct?: number | null
          organization_id?: string | null
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
          margen_bruto?: number | null
          meta_moneda?: string | null
          objetivo_ganancia_pct?: number | null
          organization_id?: string | null
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
      meta_connections: {
        Row: {
          account_id: string
          account_name: string | null
          app_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          organization_id: string | null
          token: string
          user_id: string
        }
        Insert: {
          account_id: string
          account_name?: string | null
          app_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          token: string
          user_id: string
        }
        Update: {
          account_id?: string
          account_name?: string | null
          app_id?: string | null
          created_at?: string | null
          expires_at?: string | null
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
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          plan?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          plan?: string
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
      is_admin: { Args: never; Returns: boolean }
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
