export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Suspect {
  id: string
  name: string
  role: string
  description: string
}

export interface CaseSolution {
  culprit_id: string
  culprit_name: string
  motive: string
  key_clues: string[]
  narrative_resolution: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          cases_solved: number
          cases_attempted: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          cases_solved?: number
          cases_attempted?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          cases_solved?: number
          cases_attempted?: number
          updated_at?: string
        }
        Relationships: []
      }
      cases: {
        Row: {
          id: string
          title: string
          slug: string
          description: string
          cover_image: string | null
          difficulty: string
          location: string | null
          year: number | null
          victim: string | null
          suspects: Json
          solution: Json
          system_prompt: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description: string
          cover_image?: string | null
          difficulty?: string
          location?: string | null
          year?: number | null
          victim?: string | null
          suspects?: Json
          solution: Json
          system_prompt: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          title?: string
          slug?: string
          description?: string
          cover_image?: string | null
          difficulty?: string
          location?: string | null
          year?: number | null
          victim?: string | null
          suspects?: Json
          solution?: Json
          system_prompt?: string
          is_active?: boolean
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          id: string
          user_id: string
          case_id: string
          status: string
          notes: string
          examined_clues: Json
          interrogated_suspects: Json
          final_accusation: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          case_id: string
          status?: string
          notes?: string
          examined_clues?: Json
          interrogated_suspects?: Json
          final_accusation?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: string
          notes?: string
          examined_clues?: Json
          interrogated_suspects?: Json
          final_accusation?: string | null
          resolved_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          session_id: string
          role: string
          content: string
          message_type: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: string
          content: string
          message_type?: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          content?: string
          metadata?: Json
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      increment_cases_solved: {
        Args: { user_id: string }
        Returns: void
      }
      increment_cases_attempted: {
        Args: { user_id: string }
        Returns: void
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']

export interface Case {
  id: string
  title: string
  slug: string
  description: string
  cover_image: string | null
  difficulty: 'facile' | 'moyen' | 'difficile'
  location: string | null
  year: number | null
  victim: string | null
  suspects: Suspect[]
  solution: CaseSolution
  system_prompt: string
  is_active: boolean
  created_at: string
}

export interface GameSession {
  id: string
  user_id: string
  case_id: string
  status: 'active' | 'solved' | 'failed' | 'abandoned'
  notes: string
  examined_clues: string[]
  interrogated_suspects: string[]
  final_accusation: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  message_type: 'narration' | 'interrogation' | 'clue' | 'accusation' | 'resolution'
  metadata: Json
  created_at: string
}
