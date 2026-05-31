// lib/database.types.ts – Supabase database type definitions
// Matches the existing schema: deals, deal_translations, sources

export interface Database {
  public: {
    Tables: {
      deals: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          link: string;
          image: string | null;
          source: string;
          publish_date: string;
          created_at: string;
          lang: string;
        };
        Insert: Omit<Database['public']['Tables']['deals']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['deals']['Row']>;
      };
      deal_translations: {
        Row: {
          id: string;
          deal_id: string;
          lang: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['deal_translations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['deal_translations']['Row']>;
      };
      sources: {
        Row: {
          id: string;
          name: string;
          rss_url: string;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sources']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['sources']['Row']>;
      };
    };
  };
}
