import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// فحص تشخيصي واضح
if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL missing at BUILD time');
  throw new Error('⚠️ VITE_SUPABASE_URL مفقود — أعد بناء المشروع');
}

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY missing at BUILD time');
  throw new Error('⚠️ VITE_SUPABASE_ANON_KEY مفقود — أعد بناء المشروع');
}

// تحقق من صيغة المفتاح
const isLegacyKey = supabaseAnonKey.startsWith('eyJ');
const isPublishable = supabaseAnonKey.startsWith('sb_publishable_');

console.log('✓ Supabase config loaded:', {
  url: supabaseUrl,
  keyFormat: isLegacyKey ? 'Legacy JWT ✓' : isPublishable ? 'Publishable (needs v2.45+)' : 'Unknown ⚠️',
  keyPrefix: supabaseAnonKey.substring(0, 15),
});

if (isPublishable) {
  console.warn('⚠️ Publishable key detected. If connection fails, upgrade @supabase/supabase-js to >= 2.45.0 or use Legacy anon key.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
