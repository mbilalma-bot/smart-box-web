import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iqsqykayukzxeqhuvnhf.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

if (!supabaseKey) {
  console.warn('VITE_SUPABASE_KEY environment variable is not set');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for our user_login table
export interface UserLogin {
  email: string;
  password: string;
}

// Auth service functions
export const authService = {
  async login(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      console.log('Attempting login with:', { email, hasPassword: !!password });
      console.log('Supabase URL:', supabaseUrl);
      console.log('Supabase Key exists:', !!supabaseKey);

      // Query the user_login table directly
      const { data, error } = await supabase
        .from('user_login')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        
        // Handle specific error codes
        if (error.code === 'PGRST116') {
          // No rows returned - wrong credentials
          return { success: false, error: 'Email/Username atau password salah' };
        } else if (error.code === 'PGRST301') {
          // Multiple rows returned (shouldn't happen with single())
          return { success: false, error: 'Terjadi kesalahan pada data login' };
        } else if (error.message.includes('relation "user_login" does not exist')) {
          // Table doesn't exist
          return { success: false, error: 'Tabel user_login tidak ditemukan di database' };
        } else if (error.message.includes('permission denied')) {
          // Permission issues
          return { success: false, error: 'Tidak memiliki akses ke database' };
        } else {
          // Other database errors
          return { success: false, error: `Database error: ${error.message}` };
        }
      }

      if (data) {
        console.log('Login successful for user:', data['email/username']);
        return { 
          success: true, 
          user: { 
            email: data['email/username'],
            isLoggedIn: true 
          } 
        };
      }

      // This shouldn't happen if no error occurred
      return { success: false, error: 'Email/Username atau password salah' };
    } catch (error) {
      console.error('Login catch error:', error);
      
      // Handle network or other errors
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' };
        } else if (error.message.includes('Invalid API key')) {
          return { success: false, error: 'Konfigurasi API key tidak valid' };
        } else {
          return { success: false, error: `Error: ${error.message}` };
        }
      }
      
      return { success: false, error: 'Terjadi kesalahan yang tidak diketahui' };
    }
  }
};