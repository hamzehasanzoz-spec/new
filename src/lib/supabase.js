// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// فحص المتغيرات البيئية وتقديم خطأ واضح
if (!supabaseUrl) {
  // نستخدم console.error لطباعة الرابط القادم من Vercel للمقارنة
  console.error(`❌ خطأ: VITE_SUPABASE_URL مفقود أو غير صالح. القيمة المستقبلة: "${supabaseUrl}"`);
  // نرمي خطأ واضحًا يظهر في الـ console
  throw new Error('⚠️ خطأ في إعدادات الاتصال: VITE_SUPABASE_URL مفقود.');
}

if (!supabaseAnonKey) {
  console.error('❌ خطأ: VITE_SUPABASE_ANON_KEY مفقود.');
  throw new Error('⚠️ خطأ في إعدادات الاتصال: VITE_SUPABASE_ANON_KEY مفقود.');
}

// التحقق من أن الرابط ليس به أخطاء إملائية واضحة
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.endsWith('.supabase.co')) {
  console.error(`❌ خطأ: VITE_SUPABASE_URL غير صالح. القيمة المستقبلة: "${supabaseUrl}"`);
  throw new Error('⚠️ خطأ في إعدادات الاتصال: رابط Supabase غير صالح.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// طباعة رسالة نجاح عند التحميل (تظهر في الـ console فقط)
console.log('✓ تم الاتصال بـ Supabase بنجاح:', supabaseUrl);