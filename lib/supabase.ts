import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/constants/config';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});