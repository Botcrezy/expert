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
      admin_setup_attempts: {
        Row: {
          attempt_time: string
          created_at: string
          id: string
          ip_address: string
          success: boolean
        }
        Insert: {
          attempt_time?: string
          created_at?: string
          id?: string
          ip_address: string
          success?: boolean
        }
        Update: {
          attempt_time?: string
          created_at?: string
          id?: string
          ip_address?: string
          success?: boolean
        }
        Relationships: []
      }
      ai_bot_settings: {
        Row: {
          allowed_actions: Json | null
          id: string
          is_enabled: boolean
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          allowed_actions?: Json | null
          id?: string
          is_enabled?: boolean
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          allowed_actions?: Json | null
          id?: string
          is_enabled?: boolean
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          action_payload: Json | null
          created_at: string
          id: string
          intent: string | null
          last_action: string | null
          status: string
          topic: string | null
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          action_payload?: Json | null
          created_at?: string
          id?: string
          intent?: string | null
          last_action?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          action_payload?: Json | null
          created_at?: string
          id?: string
          intent?: string | null
          last_action?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      ai_knowledge_base: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          meta: Json | null
          sender_type: string
          step_key: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          meta?: Json | null
          sender_type: string
          step_key?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          meta?: Json | null
          sender_type?: string
          step_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_support_tickets: {
        Row: {
          conversation_id: string
          created_at: string
          description: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          description: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          description?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_support_tickets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          completed_at: string | null
          freelancer_accepted: boolean | null
          freelancer_accepted_at: string | null
          freelancer_id: string
          id: string
          is_active: boolean
          notes: string | null
          payment_amount: number
          pricing_factors: Json | null
          request_id: string
          started_at: string | null
          suggested_payment: number | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          freelancer_accepted?: boolean | null
          freelancer_accepted_at?: string | null
          freelancer_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_amount?: number
          pricing_factors?: Json | null
          request_id: string
          started_at?: string | null
          suggested_payment?: number | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          freelancer_accepted?: boolean | null
          freelancer_accepted_at?: string | null
          freelancer_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_amount?: number
          pricing_factors?: Json | null
          request_id?: string
          started_at?: string | null
          suggested_payment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      brand_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          brand_id: string
          completed_at: string | null
          freelancer_id: string
          id: string
          notes: string | null
          payment_amount: number | null
          role: string | null
          status: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          brand_id: string
          completed_at?: string | null
          freelancer_id: string
          id?: string
          notes?: string | null
          payment_amount?: number | null
          role?: string | null
          status?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          brand_id?: string
          completed_at?: string | null
          freelancer_id?: string
          id?: string
          notes?: string | null
          payment_amount?: number | null
          role?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_assignments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_deliveries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          brand_id: string
          created_at: string | null
          files: Json | null
          freelancer_id: string
          id: string
          is_approved: boolean | null
          is_visible_to_client: boolean | null
          notes: string | null
          task_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          brand_id: string
          created_at?: string | null
          files?: Json | null
          freelancer_id: string
          id?: string
          is_approved?: boolean | null
          is_visible_to_client?: boolean | null
          notes?: string | null
          task_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          brand_id?: string
          created_at?: string | null
          files?: Json | null
          freelancer_id?: string
          id?: string
          is_approved?: boolean | null
          is_visible_to_client?: boolean | null
          notes?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_deliveries_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_deliveries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "brand_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_goals: {
        Row: {
          brand_id: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          is_completed: boolean | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_goals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_invoices: {
        Row: {
          amount: number
          brand_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          brand_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          brand_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_invoices_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_notes: {
        Row: {
          admin_id: string
          brand_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          note: string
        }
        Insert: {
          admin_id: string
          brand_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          note: string
        }
        Update: {
          admin_id?: string
          brand_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_notes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_tasks: {
        Row: {
          admin_notes: string | null
          assignment_id: string | null
          brand_id: string
          completed_at: string | null
          created_at: string | null
          deadline: string | null
          delivery_files: Json | null
          delivery_notes: string | null
          description: string | null
          freelancer_id: string | null
          id: string
          payment_amount: number | null
          qc_notes: string | null
          qc_reviewed_at: string | null
          qc_reviewer_id: string | null
          requirements: string | null
          status: string | null
          submitted_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          assignment_id?: string | null
          brand_id: string
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          delivery_files?: Json | null
          delivery_notes?: string | null
          description?: string | null
          freelancer_id?: string | null
          id?: string
          payment_amount?: number | null
          qc_notes?: string | null
          qc_reviewed_at?: string | null
          qc_reviewer_id?: string | null
          requirements?: string | null
          status?: string | null
          submitted_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          assignment_id?: string | null
          brand_id?: string
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          delivery_files?: Json | null
          delivery_notes?: string | null
          description?: string | null
          freelancer_id?: string | null
          id?: string
          payment_amount?: number | null
          qc_notes?: string | null
          qc_reviewed_at?: string | null
          qc_reviewer_id?: string | null
          requirements?: string | null
          status?: string | null
          submitted_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_tasks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "brand_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_tasks_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          admin_notes: string | null
          colors: Json | null
          created_at: string | null
          description: string | null
          fonts: Json | null
          id: string
          industry: string | null
          is_suspended: boolean | null
          logo_url: string | null
          name: string
          social_links: Json | null
          status: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          colors?: Json | null
          created_at?: string | null
          description?: string | null
          fonts?: Json | null
          id?: string
          industry?: string | null
          is_suspended?: boolean | null
          logo_url?: string | null
          name: string
          social_links?: Json | null
          status?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          colors?: Json | null
          created_at?: string | null
          description?: string | null
          fonts?: Json | null
          id?: string
          industry?: string | null
          is_suspended?: boolean | null
          logo_url?: string | null
          name?: string
          social_links?: Json | null
          status?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          name_ar: string
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_ar: string
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      client_subscriptions: {
        Row: {
          created_at: string
          credits_remaining: number
          expires_at: string | null
          id: string
          is_active: boolean
          plan_id: string
          revisions_used: number
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_remaining?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_id: string
          revisions_used?: number
          starts_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_remaining?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string
          revisions_used?: number
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          is_in_menu: boolean | null
          is_published: boolean | null
          menu_order: number | null
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          page_blocks: Json | null
          schema_type: string | null
          slug: string
          sort_order: number | null
          title: string
          title_ar: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          is_in_menu?: boolean | null
          is_published?: boolean | null
          menu_order?: number | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          page_blocks?: Json | null
          schema_type?: string | null
          slug: string
          sort_order?: number | null
          title: string
          title_ar: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          is_in_menu?: boolean | null
          is_published?: boolean | null
          menu_order?: number | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          page_blocks?: Json | null
          schema_type?: string | null
          slug?: string
          sort_order?: number | null
          title?: string
          title_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_sections: {
        Row: {
          content: string | null
          content_ar: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          key: string
          page_id: string | null
          settings: Json | null
          sort_order: number | null
          title: string | null
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          content_ar?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          key: string
          page_id?: string | null
          settings?: Json | null
          sort_order?: number | null
          title?: string | null
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          content_ar?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          key?: string
          page_id?: string | null
          settings?: Json | null
          sort_order?: number | null
          title?: string | null
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          discount_amount: number
          id: string
          order_id: string | null
          redeemed_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          redeemed_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          allowed_products: string[] | null
          code: string
          created_at: string
          expires_at: string | null
          first_time_only: boolean
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number | null
          min_order_amount: number | null
          starts_at: string
          type: Database["public"]["Enums"]["coupon_type"]
          uses_count: number
          value: number
        }
        Insert: {
          allowed_products?: string[] | null
          code: string
          created_at?: string
          expires_at?: string | null
          first_time_only?: boolean
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          starts_at?: string
          type?: Database["public"]["Enums"]["coupon_type"]
          uses_count?: number
          value: number
        }
        Update: {
          allowed_products?: string[] | null
          code?: string
          created_at?: string
          expires_at?: string | null
          first_time_only?: boolean
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          starts_at?: string
          type?: Database["public"]["Enums"]["coupon_type"]
          uses_count?: number
          value?: number
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          completed_at: string | null
          enrolled_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          order_id: string | null
          progress_percentage: number | null
          track_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          enrolled_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          order_id?: string | null
          progress_percentage?: number | null
          track_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          enrolled_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          order_id?: string | null
          progress_percentage?: number | null
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "learning_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      credits_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          assignment_id: string
          created_at: string
          delivery_links: Json | null
          files: Json | null
          freelancer_id: string
          id: string
          notes: string | null
          qc_notes: string | null
          qc_reviewed_at: string | null
          qc_reviewer_id: string | null
          request_id: string
          revision_number: number
          status: Database["public"]["Enums"]["delivery_status"]
        }
        Insert: {
          assignment_id: string
          created_at?: string
          delivery_links?: Json | null
          files?: Json | null
          freelancer_id: string
          id?: string
          notes?: string | null
          qc_notes?: string | null
          qc_reviewed_at?: string | null
          qc_reviewer_id?: string | null
          request_id: string
          revision_number?: number
          status?: Database["public"]["Enums"]["delivery_status"]
        }
        Update: {
          assignment_id?: string
          created_at?: string
          delivery_links?: Json | null
          files?: Json | null
          freelancer_id?: string
          id?: string
          notes?: string | null
          qc_notes?: string | null
          qc_reviewed_at?: string | null
          qc_reviewer_id?: string | null
          request_id?: string
          revision_number?: number
          status?: Database["public"]["Enums"]["delivery_status"]
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          id: string
          opened_by: string
          reason: string
          request_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          opened_by: string
          reason: string
          request_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Update: {
          created_at?: string
          id?: string
          opened_by?: string
          reason?: string
          request_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Relationships: [
          {
            foreignKeyName: "disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_certificates: {
        Row: {
          created_at: string
          credential_id: string | null
          credential_url: string | null
          expiry_date: string | null
          file_url: string | null
          id: string
          issue_date: string | null
          issuer: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      freelancer_portfolio_slug_history: {
        Row: {
          created_at: string
          id: string
          new_slug: string
          old_slug: string
          portfolio_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_slug: string
          old_slug: string
          portfolio_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_slug?: string
          old_slug?: string
          portfolio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_portfolio_slug_history_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "freelancer_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_portfolios: {
        Row: {
          avatar_url: string | null
          bio: string | null
          client_view_enabled: boolean
          completion_percentage: number | null
          cover_image: string | null
          created_at: string
          headline: string | null
          hero_settings: Json | null
          id: string
          is_public: boolean
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          show_email: boolean | null
          show_phone: boolean | null
          slug: string
          status: string | null
          subtitle: string | null
          template_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          client_view_enabled?: boolean
          completion_percentage?: number | null
          cover_image?: string | null
          created_at?: string
          headline?: string | null
          hero_settings?: Json | null
          id?: string
          is_public?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          show_email?: boolean | null
          show_phone?: boolean | null
          slug: string
          status?: string | null
          subtitle?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          client_view_enabled?: boolean
          completion_percentage?: number | null
          cover_image?: string | null
          created_at?: string
          headline?: string | null
          hero_settings?: Json | null
          id?: string
          is_public?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          show_email?: boolean | null
          show_phone?: boolean | null
          slug?: string
          status?: string | null
          subtitle?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_portfolios_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "portfolio_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_portfolios_user_id_freelancer_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "freelancer_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "freelancer_portfolios_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      freelancer_profiles: {
        Row: {
          additional_info: Json | null
          bio: string | null
          categories: string[] | null
          completed_tasks: number
          created_at: string
          cv_url: string | null
          experience: string | null
          github_url: string | null
          hourly_rate: number | null
          id: string
          identity_verified: boolean | null
          is_available: boolean
          is_verified: boolean
          linkedin_url: string | null
          portfolio_url: string | null
          rating: number | null
          skills: Json | null
          stars: number | null
          total_earnings: number
          training_completed: number | null
          updated_at: string
          user_id: string
          username: string | null
          verification_status: string | null
          withdrawal_methods: Json | null
        }
        Insert: {
          additional_info?: Json | null
          bio?: string | null
          categories?: string[] | null
          completed_tasks?: number
          created_at?: string
          cv_url?: string | null
          experience?: string | null
          github_url?: string | null
          hourly_rate?: number | null
          id?: string
          identity_verified?: boolean | null
          is_available?: boolean
          is_verified?: boolean
          linkedin_url?: string | null
          portfolio_url?: string | null
          rating?: number | null
          skills?: Json | null
          stars?: number | null
          total_earnings?: number
          training_completed?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
          verification_status?: string | null
          withdrawal_methods?: Json | null
        }
        Update: {
          additional_info?: Json | null
          bio?: string | null
          categories?: string[] | null
          completed_tasks?: number
          created_at?: string
          cv_url?: string | null
          experience?: string | null
          github_url?: string | null
          hourly_rate?: number | null
          id?: string
          identity_verified?: boolean | null
          is_available?: boolean
          is_verified?: boolean
          linkedin_url?: string | null
          portfolio_url?: string | null
          rating?: number | null
          skills?: Json | null
          stars?: number | null
          total_earnings?: number
          training_completed?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
          verification_status?: string | null
          withdrawal_methods?: Json | null
        }
        Relationships: []
      }
      freelancer_skills: {
        Row: {
          category: string | null
          created_at: string
          id: string
          level: string | null
          name: string
          sort_order: number
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          level?: string | null
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          level?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      header_footer_settings: {
        Row: {
          created_at: string
          design_variant: string
          id: string
          is_active: boolean | null
          setting_type: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          design_variant?: string
          id?: string
          is_active?: boolean | null
          setting_type: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          design_variant?: string
          id?: string
          is_active?: boolean | null
          setting_type?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      identity_verifications: {
        Row: {
          address: string
          city: string
          created_at: string
          date_of_birth: string | null
          full_name: string
          gender: string | null
          governorate: string | null
          id: string
          id_back_url: string
          id_front_url: string
          national_id: string
          nationality: string | null
          postal_code: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          governorate?: string | null
          id?: string
          id_back_url: string
          id_front_url: string
          national_id: string
          nationality?: string | null
          postal_code?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_type?: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          governorate?: string | null
          id?: string
          id_back_url?: string
          id_front_url?: string
          national_id?: string
          nationality?: string | null
          postal_code?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      learning_lessons: {
        Row: {
          content: string | null
          content_ar: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          module_id: string
          resources: Json | null
          sort_order: number | null
          title: string
          title_ar: string
          updated_at: string | null
          video_file_url: string | null
          video_type: string | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          content_ar?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          module_id: string
          resources?: Json | null
          sort_order?: number | null
          title: string
          title_ar: string
          updated_at?: string | null
          video_file_url?: string | null
          video_type?: string | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          content_ar?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          module_id?: string
          resources?: Json | null
          sort_order?: number | null
          title?: string
          title_ar?: string
          updated_at?: string | null
          video_file_url?: string | null
          video_type?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_modules: {
        Row: {
          created_at: string | null
          description: string | null
          description_ar: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          required_stars: number | null
          sort_order: number | null
          track_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          required_stars?: number | null
          sort_order?: number | null
          track_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          required_stars?: number | null
          sort_order?: number | null
          track_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_modules_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "learning_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_tracks: {
        Row: {
          audience: string | null
          cover_image: string | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          enrollment_count: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_free: boolean | null
          level: string
          name: string
          name_ar: string
          price: number | null
          required_stars: number | null
          sort_order: number | null
          target_categories: string[] | null
          updated_at: string | null
          video_intro_type: string | null
          video_intro_url: string | null
        }
        Insert: {
          audience?: string | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          enrollment_count?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          level?: string
          name: string
          name_ar: string
          price?: number | null
          required_stars?: number | null
          sort_order?: number | null
          target_categories?: string[] | null
          updated_at?: string | null
          video_intro_type?: string | null
          video_intro_url?: string | null
        }
        Update: {
          audience?: string | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          enrollment_count?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          level?: string
          name?: string
          name_ar?: string
          price?: number | null
          required_stars?: number | null
          sort_order?: number | null
          target_categories?: string[] | null
          updated_at?: string | null
          video_intro_type?: string | null
          video_intro_url?: string | null
        }
        Relationships: []
      }
      lesson_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_admin_reply: boolean | null
          lesson_id: string
          parent_id: string | null
          updated_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_admin_reply?: boolean | null
          lesson_id: string
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
          user_type?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_admin_reply?: boolean | null
          lesson_id?: string
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "learning_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "lesson_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_likes: {
        Row: {
          created_at: string | null
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_likes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "learning_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_proposals: {
        Row: {
          admin_notes: string | null
          cover_letter: string | null
          created_at: string | null
          freelancer_id: string
          id: string
          proposed_days: number | null
          proposed_price: number | null
          request_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          cover_letter?: string | null
          created_at?: string | null
          freelancer_id: string
          id?: string
          proposed_days?: number | null
          proposed_price?: number | null
          request_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          cover_letter?: string | null
          created_at?: string | null
          freelancer_id?: string
          id?: string
          proposed_days?: number | null
          proposed_price?: number | null
          request_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_system: boolean
          message: string
          request_id: string
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_system?: boolean
          message: string
          request_id: string
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_system?: boolean
          message?: string
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_items: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          label: string
          label_ar: string
          location: string
          parent_id: string | null
          sort_order: number | null
          target: string | null
          updated_at: string | null
          url: string
          visibility: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          label_ar: string
          location?: string
          parent_id?: string | null
          sort_order?: number | null
          target?: string | null
          updated_at?: string | null
          url: string
          visibility?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          label_ar?: string
          location?: string
          parent_id?: string | null
          sort_order?: number | null
          target?: string | null
          updated_at?: string | null
          url?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          source: string | null
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          source?: string | null
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          source?: string | null
          subscribed_at?: string
        }
        Relationships: []
      }
      notification_rules: {
        Row: {
          channel_in_app: boolean
          channel_telegram: boolean
          created_at: string
          description: string | null
          event_key: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          channel_in_app?: boolean
          channel_telegram?: boolean
          created_at?: string
          description?: string | null
          event_key: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          channel_in_app?: boolean
          channel_telegram?: boolean
          created_at?: string
          description?: string | null
          event_key?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          purchase_intent_id: string | null
          quantity: number
          request_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          purchase_intent_id?: string | null
          quantity?: number
          request_id?: string | null
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          purchase_intent_id?: string | null
          quantity?: number
          request_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_purchase_intent_id_fkey"
            columns: ["purchase_intent_id"]
            isOneToOne: false
            referencedRelation: "purchase_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_id: string | null
          created_at: string
          discount: number
          id: string
          order_number: string
          paid_at: string | null
          payment_method: string | null
          payment_receipt_url: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          discount?: number
          id?: string
          order_number: string
          paid_at?: string | null
          payment_method?: string | null
          payment_receipt_url?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          discount?: number
          id?: string
          order_number?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_receipt_url?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_collection_invoices: {
        Row: {
          amount: number
          client_country: string | null
          client_email: string
          client_name: string
          created_at: string | null
          created_by: string | null
          description: string
          expires_at: string
          flagged: boolean | null
          flagged_reason: string | null
          freelancer_id: string
          id: string
          invoice_number: string | null
          kashier_order_id: string | null
          kashier_transaction_id: string | null
          paid_at: string | null
          payment_url: string | null
          released_at: string | null
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          client_country?: string | null
          client_email: string
          client_name: string
          created_at?: string | null
          created_by?: string | null
          description: string
          expires_at: string
          flagged?: boolean | null
          flagged_reason?: string | null
          freelancer_id: string
          id?: string
          invoice_number?: string | null
          kashier_order_id?: string | null
          kashier_transaction_id?: string | null
          paid_at?: string | null
          payment_url?: string | null
          released_at?: string | null
          status?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          client_country?: string | null
          client_email?: string
          client_name?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          expires_at?: string
          flagged?: boolean | null
          flagged_reason?: string | null
          freelancer_id?: string
          id?: string
          invoice_number?: string | null
          kashier_order_id?: string | null
          kashier_transaction_id?: string | null
          paid_at?: string | null
          payment_url?: string | null
          released_at?: string | null
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_collection_settings: {
        Row: {
          agreed_at: string | null
          agreed_to_terms: boolean | null
          created_at: string | null
          expected_monthly_amount: string | null
          has_international_clients: boolean | null
          id: string
          is_enabled: boolean | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string | null
          usage_purpose: string | null
          user_id: string
        }
        Insert: {
          agreed_at?: string | null
          agreed_to_terms?: boolean | null
          created_at?: string | null
          expected_monthly_amount?: string | null
          has_international_clients?: boolean | null
          id?: string
          is_enabled?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          usage_purpose?: string | null
          user_id: string
        }
        Update: {
          agreed_at?: string | null
          agreed_to_terms?: boolean | null
          created_at?: string | null
          expected_monthly_amount?: string | null
          has_international_clients?: boolean | null
          id?: string
          is_enabled?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          usage_purpose?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          credits_per_month: number
          features: Json | null
          id: string
          is_active: boolean
          is_free: boolean
          max_task_size: Database["public"]["Enums"]["task_size"]
          name: string
          name_ar: string
          price: number
          priority_assignment: boolean
          qc_level: string | null
          revisions_limit: number
          sla_hours: number | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          credits_per_month?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          max_task_size?: Database["public"]["Enums"]["task_size"]
          name: string
          name_ar: string
          price?: number
          priority_assignment?: boolean
          qc_level?: string | null
          revisions_limit?: number
          sla_hours?: number | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          credits_per_month?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          max_task_size?: Database["public"]["Enums"]["task_size"]
          name?: string
          name_ar?: string
          price?: number
          priority_assignment?: boolean
          qc_level?: string | null
          revisions_limit?: number
          sla_hours?: number | null
          sort_order?: number
        }
        Relationships: []
      }
      portfolio_projects: {
        Row: {
          attachments: Json
          completion_date: string | null
          created_at: string | null
          description: string | null
          external_link: string | null
          freelancer_id: string
          id: string
          images: Json | null
          is_visible: boolean | null
          project_type: string | null
          sort_order: number | null
          title: string
          tools_used: string[] | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          attachments?: Json
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          external_link?: string | null
          freelancer_id: string
          id?: string
          images?: Json | null
          is_visible?: boolean | null
          project_type?: string | null
          sort_order?: number | null
          title: string
          tools_used?: string[] | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          attachments?: Json
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          external_link?: string | null
          freelancer_id?: string
          id?: string
          images?: Json | null
          is_visible?: boolean | null
          project_type?: string | null
          sort_order?: number | null
          title?: string
          tools_used?: string[] | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      portfolio_sections: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          portfolio_id: string
          section_key: string
          settings: Json | null
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          portfolio_id: string
          section_key: string
          settings?: Json | null
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          portfolio_id?: string
          section_key?: string
          settings?: Json | null
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_sections_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "freelancer_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_service_addons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          price_egp: number
          service_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          price_egp?: number
          service_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          price_egp?: number
          service_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_service_addons_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "portfolio_services"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_services: {
        Row: {
          attachments: Json
          created_at: string | null
          deliverables: Json
          description: string | null
          estimated_days: number | null
          execution_date: string | null
          freelancer_id: string
          id: string
          images: Json
          is_active: boolean | null
          portfolio_picture: string | null
          price_egp: number
          requirements: Json
          revisions_included: number | null
          short_description: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          attachments?: Json
          created_at?: string | null
          deliverables?: Json
          description?: string | null
          estimated_days?: number | null
          execution_date?: string | null
          freelancer_id: string
          id?: string
          images?: Json
          is_active?: boolean | null
          portfolio_picture?: string | null
          price_egp: number
          requirements?: Json
          revisions_included?: number | null
          short_description?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          attachments?: Json
          created_at?: string | null
          deliverables?: Json
          description?: string | null
          estimated_days?: number | null
          execution_date?: string | null
          freelancer_id?: string
          id?: string
          images?: Json
          is_active?: boolean | null
          portfolio_picture?: string | null
          price_egp?: number
          requirements?: Json
          revisions_included?: number | null
          short_description?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      portfolio_templates: {
        Row: {
          created_at: string
          default_settings: Json | null
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          preview_image_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_settings?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          preview_image_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_settings?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          preview_image_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          credits: number | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          name_ar: string
          plan_id: string | null
          price: number
          sort_order: number
          track_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          credits?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_ar: string
          plan_id?: string | null
          price?: number
          sort_order?: number
          track_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          credits?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string
          plan_id?: string | null
          price?: number
          sort_order?: number
          track_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "learning_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          governorate: string | null
          id: string
          identity_verified: boolean | null
          is_banned: boolean | null
          is_verified: boolean | null
          national_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          governorate?: string | null
          id?: string
          identity_verified?: boolean | null
          is_banned?: boolean | null
          is_verified?: boolean | null
          national_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          governorate?: string | null
          id?: string
          identity_verified?: boolean | null
          is_banned?: boolean | null
          is_verified?: boolean | null
          national_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          admin_notes: string | null
          assigned_at: string | null
          completed_at: string | null
          created_at: string | null
          deadline: string | null
          delivery_files: Json | null
          delivery_notes: string | null
          description: string | null
          freelancer_accepted: boolean | null
          freelancer_accepted_at: string | null
          freelancer_id: string | null
          id: string
          payment_amount: number | null
          pricing_factors: Json | null
          request_id: string
          requirements: string | null
          started_at: string | null
          status: string | null
          submitted_at: string | null
          suggested_payment: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          delivery_files?: Json | null
          delivery_notes?: string | null
          description?: string | null
          freelancer_accepted?: boolean | null
          freelancer_accepted_at?: string | null
          freelancer_id?: string | null
          id?: string
          payment_amount?: number | null
          pricing_factors?: Json | null
          request_id: string
          requirements?: string | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          suggested_payment?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          delivery_files?: Json | null
          delivery_notes?: string | null
          description?: string | null
          freelancer_accepted?: boolean | null
          freelancer_accepted_at?: string | null
          freelancer_id?: string | null
          id?: string
          payment_amount?: number | null
          pricing_factors?: Json | null
          request_id?: string
          requirements?: string | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          suggested_payment?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_intents: {
        Row: {
          addons_snapshot: Json
          created_at: string
          description_snapshot: string | null
          freelancer_id: string
          id: string
          order_id: string | null
          portfolio_service_id: string
          price_egp_snapshot: number
          quantity: number
          status: string
          title_snapshot: string
          total_price_egp_snapshot: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          addons_snapshot?: Json
          created_at?: string
          description_snapshot?: string | null
          freelancer_id: string
          id?: string
          order_id?: string | null
          portfolio_service_id: string
          price_egp_snapshot: number
          quantity?: number
          status?: string
          title_snapshot: string
          total_price_egp_snapshot?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          addons_snapshot?: Json
          created_at?: string
          description_snapshot?: string | null
          freelancer_id?: string
          id?: string
          order_id?: string | null
          portfolio_service_id?: string
          price_egp_snapshot?: number
          quantity?: number
          status?: string
          title_snapshot?: string
          total_price_egp_snapshot?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string
          id: string
          last_reward_at: string | null
          referral_count: number
          rewards_earned: number
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_reward_at?: string | null
          referral_count?: number
          rewards_earned?: number
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string
          id?: string
          last_reward_at?: string | null
          referral_count?: number
          rewards_earned?: number
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          referrer_type: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          referrer_type: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          referrer_type?: string
          status?: string
        }
        Relationships: []
      }
      request_briefs: {
        Row: {
          brief_text: string
          client_id: string
          created_at: string
          files: Json
          goals: Json
          id: string
          request_id: string
          updated_at: string
        }
        Insert: {
          brief_text: string
          client_id: string
          created_at?: string
          files?: Json
          goals?: Json
          id?: string
          request_id: string
          updated_at?: string
        }
        Update: {
          brief_text?: string
          client_id?: string
          created_at?: string
          files?: Json
          goals?: Json
          id?: string
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_briefs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_info_replies: {
        Row: {
          attachments: Json | null
          client_id: string
          created_at: string
          id: string
          info_request_id: string
          message: string
        }
        Insert: {
          attachments?: Json | null
          client_id: string
          created_at?: string
          id?: string
          info_request_id: string
          message: string
        }
        Update: {
          attachments?: Json | null
          client_id?: string
          created_at?: string
          id?: string
          info_request_id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_info_replies_info_request_id_fkey"
            columns: ["info_request_id"]
            isOneToOne: false
            referencedRelation: "request_info_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_info_requests: {
        Row: {
          admin_id: string
          attachments: Json | null
          created_at: string
          id: string
          message: string
          request_id: string
          status: string
          title: string | null
        }
        Insert: {
          admin_id: string
          attachments?: Json | null
          created_at?: string
          id?: string
          message: string
          request_id: string
          status?: string
          title?: string | null
        }
        Update: {
          admin_id?: string
          attachments?: Json | null
          created_at?: string
          id?: string
          message?: string
          request_id?: string
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_info_requests_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_public_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          request_id: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          request_id: string
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          request_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_public_links_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_ratings: {
        Row: {
          client_id: string
          comment: string | null
          communication: number
          created_at: string
          id: string
          quality: number
          request_id: string
          speed: number
        }
        Insert: {
          client_id: string
          comment?: string | null
          communication: number
          created_at?: string
          id?: string
          quality: number
          request_id: string
          speed: number
        }
        Update: {
          client_id?: string
          comment?: string | null
          communication?: number
          created_at?: string
          id?: string
          quality?: number
          request_id?: string
          speed?: number
        }
        Relationships: [
          {
            foreignKeyName: "request_ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_templates: {
        Row: {
          category_id: string | null
          created_at: string
          description_template: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          size: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description_template?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          size?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description_template?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          size?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          admin_notes: string | null
          agreed_price_egp: number | null
          category_id: string | null
          created_at: string
          credits_cost: number
          deadline: string | null
          description: string | null
          estimated_budget: number | null
          files: Json | null
          id: string
          idempotency_key: string | null
          payment_order_id: string | null
          portfolio_service_id: string | null
          preferred_freelancer_id: string | null
          priority: string | null
          publish_mode: string
          request_number: string
          service_addons_snapshot: Json
          size: Database["public"]["Enums"]["task_size"]
          source: string | null
          status: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          agreed_price_egp?: number | null
          category_id?: string | null
          created_at?: string
          credits_cost?: number
          deadline?: string | null
          description?: string | null
          estimated_budget?: number | null
          files?: Json | null
          id?: string
          idempotency_key?: string | null
          payment_order_id?: string | null
          portfolio_service_id?: string | null
          preferred_freelancer_id?: string | null
          priority?: string | null
          publish_mode?: string
          request_number: string
          service_addons_snapshot?: Json
          size?: Database["public"]["Enums"]["task_size"]
          source?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          agreed_price_egp?: number | null
          category_id?: string | null
          created_at?: string
          credits_cost?: number
          deadline?: string | null
          description?: string | null
          estimated_budget?: number | null
          files?: Json | null
          id?: string
          idempotency_key?: string | null
          payment_order_id?: string | null
          portfolio_service_id?: string | null
          preferred_freelancer_id?: string | null
          priority?: string | null
          publish_mode?: string
          request_number?: string
          service_addons_snapshot?: Json
          size?: Database["public"]["Enums"]["task_size"]
          source?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          group_name: string
          id: string
          is_public: boolean | null
          key: string
          type: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          description?: string | null
          group_name?: string
          id?: string
          is_public?: boolean | null
          key: string
          type?: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          description?: string | null
          group_name?: string
          id?: string
          is_public?: boolean | null
          key?: string
          type?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          category: string | null
          id: string
          is_public: boolean | null
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          category?: string | null
          id?: string
          is_public?: boolean | null
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          category?: string | null
          id?: string
          is_public?: boolean | null
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          priority: string | null
          request_id: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          priority?: string | null
          request_id?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          priority?: string | null
          request_id?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachments: Json | null
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachments?: Json | null
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          sender_id: string
          sender_type: string
        }
        Update: {
          attachments?: Json | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          message: string
          priority: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          assignment_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          request_id: string
          sort_order: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assignment_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          request_id: string
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assignment_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          request_id?: string
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_bot_messages: {
        Row: {
          audience: string | null
          created_at: string
          description: string | null
          event_key: string | null
          id: string
          is_active: boolean | null
          message_key: string
          message_template: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          audience?: string | null
          created_at?: string
          description?: string | null
          event_key?: string | null
          id?: string
          is_active?: boolean | null
          message_key: string
          message_template: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          audience?: string | null
          created_at?: string
          description?: string | null
          event_key?: string | null
          id?: string
          is_active?: boolean | null
          message_key?: string
          message_template?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      telegram_link_attempts: {
        Row: {
          code: string | null
          created_at: string
          error_message: string | null
          id: string
          status: string
          telegram_chat_id: string | null
          telegram_user_id: string | null
          telegram_username: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          telegram_chat_id?: string | null
          telegram_user_id?: string | null
          telegram_username?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          telegram_chat_id?: string | null
          telegram_user_id?: string | null
          telegram_username?: string | null
        }
        Relationships: []
      }
      telegram_link_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used_at?: string | null
          user_id: string
          user_type?: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      telegram_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          linked_at: string
          telegram_chat_id: string
          telegram_user_id: string | null
          telegram_username: string | null
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          linked_at?: string
          telegram_chat_id: string
          telegram_user_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id: string
          user_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          linked_at?: string
          telegram_chat_id?: string
          telegram_user_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      telegram_messages_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          is_delivered: boolean | null
          message_text: string | null
          message_type: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          status: string
          telegram_chat_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          is_delivered?: boolean | null
          message_text?: string | null
          message_type: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          telegram_chat_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          is_delivered?: boolean | null
          message_text?: string | null
          message_type?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          telegram_chat_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      telegram_template_variables: {
        Row: {
          audience: string
          created_at: string
          description: string | null
          id: string
          message_key: string
          sample_value: string | null
          variable_name: string
        }
        Insert: {
          audience: string
          created_at?: string
          description?: string | null
          id?: string
          message_key: string
          sample_value?: string | null
          variable_name: string
        }
        Update: {
          audience?: string
          created_at?: string
          description?: string | null
          id?: string
          message_key?: string
          sample_value?: string | null
          variable_name?: string
        }
        Relationships: []
      }
      telegram_templates: {
        Row: {
          audience: string
          created_at: string
          event_key: string
          id: string
          is_active: boolean
          template_text: string
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          event_key: string
          id?: string
          is_active?: boolean
          template_text: string
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          event_key?: string
          id?: string
          is_active?: boolean
          template_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          rating: number | null
          role: string | null
          sort_order: number | null
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rating?: number | null
          role?: string | null
          sort_order?: number | null
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rating?: number | null
          role?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      training_assignments: {
        Row: {
          admin_feedback: string | null
          created_at: string | null
          delivery_files: Json | null
          delivery_links: Json
          delivery_notes: string | null
          freelancer_id: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          stars_earned: number | null
          started_at: string | null
          status: string | null
          submitted_at: string | null
          task_id: string | null
        }
        Insert: {
          admin_feedback?: string | null
          created_at?: string | null
          delivery_files?: Json | null
          delivery_links?: Json
          delivery_notes?: string | null
          freelancer_id: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          stars_earned?: number | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          task_id?: string | null
        }
        Update: {
          admin_feedback?: string | null
          created_at?: string | null
          delivery_files?: Json | null
          delivery_links?: Json
          delivery_notes?: string | null
          freelancer_id?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          stars_earned?: number | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "training_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_tasks: {
        Row: {
          audience: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          credits_reward: number | null
          deadline_hours: number | null
          description: string | null
          difficulty: string | null
          id: string
          is_active: boolean | null
          is_category_specific: boolean | null
          is_mandatory: boolean | null
          lesson_id: string | null
          min_stars_required: number | null
          module_id: string | null
          requirements: string | null
          stars_reward: number | null
          submission_method: string
          target_categories: string[] | null
          title: string
          track_id: string | null
          updated_at: string | null
        }
        Insert: {
          audience?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credits_reward?: number | null
          deadline_hours?: number | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          is_category_specific?: boolean | null
          is_mandatory?: boolean | null
          lesson_id?: string | null
          min_stars_required?: number | null
          module_id?: string | null
          requirements?: string | null
          stars_reward?: number | null
          submission_method?: string
          target_categories?: string[] | null
          title: string
          track_id?: string | null
          updated_at?: string | null
        }
        Update: {
          audience?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credits_reward?: number | null
          deadline_hours?: number | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          is_category_specific?: boolean | null
          is_mandatory?: boolean | null
          lesson_id?: string | null
          min_stars_required?: number | null
          module_id?: string | null
          requirements?: string | null
          stars_reward?: number | null
          submission_method?: string
          target_categories?: string[] | null
          title?: string
          track_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_tasks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "learning_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_tasks_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_tasks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "learning_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lesson_progress: {
        Row: {
          completed_at: string | null
          id: string
          is_completed: boolean | null
          last_watched_at: string | null
          lesson_id: string
          started_at: string | null
          total_seconds: number | null
          user_id: string
          watch_percentage: number | null
          watched_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_watched_at?: string | null
          lesson_id: string
          started_at?: string | null
          total_seconds?: number | null
          user_id: string
          watch_percentage?: number | null
          watched_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_watched_at?: string | null
          lesson_id?: string
          started_at?: string | null
          total_seconds?: number | null
          user_id?: string
          watch_percentage?: number | null
          watched_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "learning_lessons"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_track_progress: {
        Row: {
          certificate_issued: boolean | null
          certificate_issued_at: string | null
          certificate_number: string | null
          completed_at: string | null
          current_lesson_id: string | null
          current_module_id: string | null
          id: string
          last_accessed_at: string | null
          lessons_completed: number | null
          progress_percentage: number | null
          started_at: string | null
          total_lessons: number | null
          track_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certificate_issued?: boolean | null
          certificate_issued_at?: string | null
          certificate_number?: string | null
          completed_at?: string | null
          current_lesson_id?: string | null
          current_module_id?: string | null
          id?: string
          last_accessed_at?: string | null
          lessons_completed?: number | null
          progress_percentage?: number | null
          started_at?: string | null
          total_lessons?: number | null
          track_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certificate_issued?: boolean | null
          certificate_issued_at?: string | null
          certificate_number?: string | null
          completed_at?: string | null
          current_lesson_id?: string | null
          current_module_id?: string | null
          id?: string
          last_accessed_at?: string | null
          lessons_completed?: number | null
          progress_percentage?: number | null
          started_at?: string | null
          total_lessons?: number | null
          track_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_track_progress_current_lesson_id_fkey"
            columns: ["current_lesson_id"]
            isOneToOne: false
            referencedRelation: "learning_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_track_progress_current_module_id_fkey"
            columns: ["current_module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_track_progress_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "learning_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      assignments_safe: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          completed_at: string | null
          freelancer_id: string | null
          id: string | null
          is_active: boolean | null
          notes: string | null
          request_id: string | null
          started_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          freelancer_id?: string | null
          id?: string | null
          is_active?: boolean | null
          notes?: string | null
          request_id?: string | null
          started_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          freelancer_id?: string | null
          id?: string | null
          is_active?: boolean | null
          notes?: string | null
          request_id?: string | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          categories: string[] | null
          completed_tasks: number | null
          display_id: string | null
          experience: string | null
          full_name: string | null
          id: string | null
          is_available: boolean | null
          is_verified: boolean | null
          portfolio_slug: string | null
          rating: number | null
          skills: Json | null
        }
        Relationships: []
      }
      orders_safe: {
        Row: {
          coupon_id: string | null
          created_at: string | null
          discount: number | null
          id: string | null
          order_number: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string | null
          discount?: number | null
          id?: string | null
          order_number?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string | null
          created_at?: string | null
          discount?: number | null
          id?: string | null
          order_number?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_estimated_price: {
        Args: { p_credits: number }
        Returns: number
      }
      can_read_request_file: {
        Args: { p_object_name: string }
        Returns: boolean
      }
      can_read_training_file: {
        Args: { p_object_name: string }
        Returns: boolean
      }
      can_view_request: { Args: { p_request_id: string }; Returns: boolean }
      cleanup_old_admin_setup_attempts: { Args: never; Returns: undefined }
      convert_paid_order_service_purchases: {
        Args: { _order_id: string }
        Returns: Json
      }
      create_request_with_credits: {
        Args: {
          p_category_id: string
          p_deadline: string
          p_description: string
          p_files: Json
          p_idempotency_key: string
          p_request_id: string
          p_size: Database["public"]["Enums"]["task_size"]
          p_title: string
          p_user_id: string
        }
        Returns: {
          admin_notes: string | null
          agreed_price_egp: number | null
          category_id: string | null
          created_at: string
          credits_cost: number
          deadline: string | null
          description: string | null
          estimated_budget: number | null
          files: Json | null
          id: string
          idempotency_key: string | null
          payment_order_id: string | null
          portfolio_service_id: string | null
          preferred_freelancer_id: string | null
          priority: string | null
          publish_mode: string
          request_number: string
          service_addons_snapshot: Json
          size: Database["public"]["Enums"]["task_size"]
          source: string | null
          status: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fulfill_paid_order: { Args: { _order_id: string }; Returns: undefined }
      generate_telegram_link_code: {
        Args: { p_user_id: string; p_user_type?: string }
        Returns: string
      }
      get_client_orders: {
        Args: { p_user_id: string }
        Returns: {
          coupon_id: string
          created_at: string
          discount: number
          id: string
          order_number: string
          paid_at: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }[]
      }
      get_client_requests: {
        Args: { p_user_id: string }
        Returns: {
          category_id: string
          created_at: string
          credits_cost: number
          deadline: string
          description: string
          files: Json
          id: string
          priority: string
          request_number: string
          size: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      get_freelancer_public_info: { Args: { p_user_id: string }; Returns: Json }
      get_payment_collection_invoice_public: {
        Args: { p_token: string }
        Returns: Json
      }
      get_platform_stats_for_telegram: { Args: never; Returns: Json }
      get_public_portfolio_page: { Args: { p_slug: string }; Returns: Json }
      get_public_request_view: { Args: { p_token: string }; Returns: Json }
      get_user_display_name: { Args: { p_user_id: string }; Returns: string }
      get_verification_settings: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      is_assigned_to_request: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      is_request_assigned_to_freelancer: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      is_request_owner: { Args: { p_request_id: string }; Returns: boolean }
      release_task_payment: {
        Args: { p_admin_id: string; p_task_id: string; p_task_type: string }
        Returns: Json
      }
      resolve_portfolio_slug: { Args: { p_slug: string }; Returns: string }
      unlink_telegram_account:
        | {
            Args: { p_chat_id: string }
            Returns: {
              message: string
              success: boolean
            }[]
          }
        | {
            Args: { p_user_id: string }
            Returns: {
              message: string
              success: boolean
            }[]
          }
      verify_telegram_link_code: {
        Args: {
          p_code: string
          p_telegram_chat_id: string
          p_telegram_user_id?: string
          p_telegram_username?: string
        }
        Returns: {
          message: string
          success: boolean
          user_id: string
          user_type: string
        }[]
      }
    }
    Enums: {
      app_role: "client" | "freelancer" | "team_leader" | "admin"
      coupon_type: "percent" | "fixed"
      delivery_status: "pending" | "approved" | "rejected" | "resubmitted"
      dispute_status:
        | "opened"
        | "under_review"
        | "resolved_refund"
        | "resolved_reassign"
        | "closed"
      order_status:
        | "cart"
        | "pending_payment"
        | "paid"
        | "failed"
        | "cancelled"
        | "refunded"
      request_status:
        | "submitted"
        | "needs_info"
        | "approved"
        | "assigned"
        | "in_progress"
        | "ready_for_qc"
        | "qc_rejected"
        | "delivered_to_client"
        | "revision_requested"
        | "completed"
        | "cancelled"
      task_size: "micro" | "small" | "medium" | "large"
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
      app_role: ["client", "freelancer", "team_leader", "admin"],
      coupon_type: ["percent", "fixed"],
      delivery_status: ["pending", "approved", "rejected", "resubmitted"],
      dispute_status: [
        "opened",
        "under_review",
        "resolved_refund",
        "resolved_reassign",
        "closed",
      ],
      order_status: [
        "cart",
        "pending_payment",
        "paid",
        "failed",
        "cancelled",
        "refunded",
      ],
      request_status: [
        "submitted",
        "needs_info",
        "approved",
        "assigned",
        "in_progress",
        "ready_for_qc",
        "qc_rejected",
        "delivered_to_client",
        "revision_requested",
        "completed",
        "cancelled",
      ],
      task_size: ["micro", "small", "medium", "large"],
    },
  },
} as const
