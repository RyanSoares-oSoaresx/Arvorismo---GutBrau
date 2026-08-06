import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseUrl !== 'https://your-supabase-project.supabase.co' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'your-anon-key-here';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'As variáveis de ambiente do Supabase não foram configuradas corretamente ou estão ausentes.' };
  }
  try {
    const { error } = await supabase
      .from('colaboradores')
      .select('id')
      .limit(1);
    
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de rede ou conexão desconhecido.' };
  }
}
