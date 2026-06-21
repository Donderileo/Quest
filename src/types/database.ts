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
      home_members: {
        Row: {
          home_id: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          home_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          home_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_members_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homes: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
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
      space_member_points: {
        Row: {
          space_id: string
          total_points: number
          user_id: string
        }
        Insert: {
          space_id: string
          total_points?: number
          user_id: string
        }
        Update: {
          space_id?: string
          total_points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_member_points_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_member_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      space_members: {
        Row: {
          joined_at: string
          space_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          space_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          home_id: string
          icon: string | null
          id: string
          mode: Database["public"]["Enums"]["space_mode"]
          name: string
        }
        Insert: {
          created_at?: string
          home_id: string
          icon?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["space_mode"]
          name: string
        }
        Update: {
          created_at?: string
          home_id?: string
          icon?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["space_mode"]
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      task_occurrences: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          due_date: string
          id: string
          points_awarded: number
          status: Database["public"]["Enums"]["occurrence_status"]
          task_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          due_date: string
          id?: string
          points_awarded?: number
          status?: Database["public"]["Enums"]["occurrence_status"]
          task_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          due_date?: string
          id?: string
          points_awarded?: number
          status?: Database["public"]["Enums"]["occurrence_status"]
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_occurrences_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_occurrences_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_occurrences_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_rotation_queue: {
        Row: {
          position: number
          task_id: string
          user_id: string
        }
        Insert: {
          position: number
          task_id: string
          user_id: string
        }
        Update: {
          position?: number
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_rotation_queue_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_rotation_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          assignee_id: string | null
          assignment_type: Database["public"]["Enums"]["assignment_type"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          points: number
          recurrence_days: number[]
          recurrence_interval_days: number | null
          recurrence_type: Database["public"]["Enums"]["recurrence_type"]
          space_id: string
          start_date: string
          title: string
        }
        Insert: {
          archived_at?: string | null
          assignee_id?: string | null
          assignment_type: Database["public"]["Enums"]["assignment_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          points?: number
          recurrence_days?: number[]
          recurrence_interval_days?: number | null
          recurrence_type: Database["public"]["Enums"]["recurrence_type"]
          space_id: string
          start_date?: string
          title: string
        }
        Update: {
          archived_at?: string | null
          assignee_id?: string | null
          assignment_type?: Database["public"]["Enums"]["assignment_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          points?: number
          recurrence_days?: number[]
          recurrence_interval_days?: number | null
          recurrence_type?: Database["public"]["Enums"]["recurrence_type"]
          space_id?: string
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_home: {
        Args: { home_name: string }
        Returns: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "homes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gen_invite_code: { Args: never; Returns: string }
      home_role: {
        Args: { h: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
      is_home_member: { Args: { h: string }; Returns: boolean }
      join_home: {
        Args: { code: string }
        Returns: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "homes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      space_home: { Args: { s: string }; Returns: string }
      task_space: { Args: { t: string }; Returns: string }
    }
    Enums: {
      assignment_type: "fixed" | "rotation"
      member_role: "owner" | "admin" | "member"
      occurrence_status: "pending" | "done" | "skipped"
      recurrence_type: "daily" | "weekly" | "custom"
      space_mode: "simple" | "gamified"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assignment_type: ["fixed", "rotation"],
      member_role: ["owner", "admin", "member"],
      occurrence_status: ["pending", "done", "skipped"],
      recurrence_type: ["daily", "weekly", "custom"],
      space_mode: ["simple", "gamified"],
    },
  },
} as const

