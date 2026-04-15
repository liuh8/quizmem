export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      daily_plans: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          new_question_ids: Json;
          review_question_ids: Json;
          completed_new_question_ids: Json;
          completed_review_question_ids: Json;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          new_question_ids?: Json;
          review_question_ids?: Json;
          completed_new_question_ids?: Json;
          completed_review_question_ids?: Json;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          new_question_ids?: Json;
          review_question_ids?: Json;
          completed_new_question_ids?: Json;
          completed_review_question_ids?: Json;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          target_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          target_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          target_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_logs: {
        Row: {
          id: string;
          user_id: string;
          question_id: number;
          question_type: string;
          user_answer: string | null;
          is_correct: boolean;
          answered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: number;
          question_type: string;
          user_answer?: string | null;
          is_correct: boolean;
          answered_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question_id?: number;
          question_type?: string;
          user_answer?: string | null;
          is_correct?: boolean;
          answered_at?: string;
        };
        Relationships: [];
      };
      wrong_books: {
        Row: {
          user_id: string;
          question_id: number;
          wrong_count: number;
          added_at: string;
          last_wrong_at: string;
          is_resolved: boolean;
        };
        Insert: {
          user_id: string;
          question_id: number;
          wrong_count?: number;
          added_at?: string;
          last_wrong_at?: string;
          is_resolved?: boolean;
        };
        Update: {
          user_id?: string;
          question_id?: number;
          wrong_count?: number;
          added_at?: string;
          last_wrong_at?: string;
          is_resolved?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
