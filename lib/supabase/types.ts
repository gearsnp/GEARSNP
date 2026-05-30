// ============================================
// GearsNP Database Types
// ============================================
// Auto-generated types for Supabase tables
// Update when schema changes

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: 'admin' | 'staff' | 'customer';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: 'admin' | 'staff' | 'customer';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: 'admin' | 'staff' | 'customer';
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sku: string | null;
          category_id: string | null;
          team_id: string | null;
          short_description: string | null;
          description: string | null;
          base_price: number;
          compare_at_price: number | null;
          currency: string;
          is_featured: boolean;
          is_active: boolean;
          stock: number;
          hero_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          sku?: string | null;
          category_id?: string | null;
          team_id?: string | null;
          short_description?: string | null;
          description?: string | null;
          base_price: number;
          compare_at_price?: number | null;
          currency?: string;
          is_featured?: boolean;
          is_active?: boolean;
          stock?: number;
          hero_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          sku?: string | null;
          category_id?: string | null;
          team_id?: string | null;
          short_description?: string | null;
          description?: string | null;
          base_price?: number;
          compare_at_price?: number | null;
          currency?: string;
          is_featured?: boolean;
          is_active?: boolean;
          stock?: number;
          hero_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          image_url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          image_url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          image_url?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          location: string | null;
          event_date: string;
          banner_image_url: string | null;
          is_active: boolean;
          is_ticketed: boolean;
          ticket_price: number | null;
          ticket_capacity: number | null;
          payment_instructions: string | null;
          payment_qr_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          location?: string | null;
          event_date: string;
          banner_image_url?: string | null;
          is_active?: boolean;
          is_ticketed?: boolean;
          ticket_price?: number | null;
          ticket_capacity?: number | null;
          payment_instructions?: string | null;
          payment_qr_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          location?: string | null;
          event_date?: string;
          banner_image_url?: string | null;
          is_active?: boolean;
          is_ticketed?: boolean;
          ticket_price?: number | null;
          ticket_capacity?: number | null;
          payment_instructions?: string | null;
          payment_qr_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ticket_qr_codes: {
        Row: {
          id: string;
          booking_id: string;
          qr_token: string;
          ticket_index: number;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          qr_token?: string;
          ticket_index: number;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          qr_token?: string;
          ticket_index?: number;
          used_at?: string | null;
          created_at?: string;
        };
      };
      ticket_bookings: {
        Row: {
          id: string;
          event_id: string;
          booking_number: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          quantity: number;
          unit_price: number;
          total_amount: number;
          payment_proof_url: string | null;
          payment_status: 'pending' | 'approved' | 'rejected';
          qr_token: string;
          used_at: string | null;
          admin_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          booking_number?: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          quantity?: number;
          unit_price: number;
          total_amount: number;
          payment_proof_url?: string | null;
          payment_status?: 'pending' | 'approved' | 'rejected';
          qr_token?: string;
          used_at?: string | null;
          admin_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          booking_number?: string;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          quantity?: number;
          unit_price?: number;
          total_amount?: number;
          payment_proof_url?: string | null;
          payment_status?: 'pending' | 'approved' | 'rejected';
          qr_token?: string;
          used_at?: string | null;
          admin_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string | null;
          status: 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled';
          payment_status: 'unpaid' | 'paid' | 'refunded';
          subtotal: number;
          shipping_fee: number;
          discount_amount: number;
          total: number;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          shipping_address: string;
          city: string;
          delivery_zone: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          user_id?: string | null;
          status?: 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled';
          payment_status?: 'unpaid' | 'paid' | 'refunded';
          subtotal: number;
          shipping_fee?: number;
          discount_amount?: number;
          total: number;
          customer_name: string;
          customer_phone: string;
          customer_email?: string | null;
          shipping_address: string;
          city: string;
          delivery_zone?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string | null;
          status?: 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled';
          payment_status?: 'unpaid' | 'paid' | 'refunded';
          subtotal?: number;
          shipping_fee?: number;
          discount_amount?: number;
          total?: number;
          customer_name?: string;
          customer_phone?: string;
          customer_email?: string | null;
          shipping_address?: string;
          city?: string;
          delivery_zone?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          size: string | null;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          size?: string | null;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          size?: string | null;
          color?: string | null;
          created_at?: string;
        };
      };
      deliveries: {
        Row: {
          id: string;
          order_id: string;
          provider: string | null;
          tracking_code: string | null;
          status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed';
          estimated_delivery_date: string | null;
          delivered_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider?: string | null;
          tracking_code?: string | null;
          status?: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed';
          estimated_delivery_date?: string | null;
          delivered_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          provider?: string | null;
          tracking_code?: string | null;
          status?: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed';
          estimated_delivery_date?: string | null;
          delivered_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      settings: {
        Row: {
          id: number;
          site_name: string;
          hero_title: string | null;
          hero_subtitle: string | null;
          promo_text: string | null;
          banner_image_url: string | null;
          primary_color: string;
          secondary_color: string;
          support_phone: string | null;
          support_email: string | null;
          instagram_url: string | null;
          tiktok_url: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          site_name?: string;
          hero_title?: string | null;
          hero_subtitle?: string | null;
          promo_text?: string | null;
          banner_image_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          support_phone?: string | null;
          support_email?: string | null;
          instagram_url?: string | null;
          tiktok_url?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          site_name?: string;
          hero_title?: string | null;
          hero_subtitle?: string | null;
          promo_text?: string | null;
          banner_image_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          support_phone?: string | null;
          support_email?: string | null;
          instagram_url?: string | null;
          tiktok_url?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
