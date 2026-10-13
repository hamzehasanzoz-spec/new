import { supabase } from './supabase';

const BUCKET = 'avatars';

// رفع صورة رمزية
export async function uploadAvatar(userId, file) {
  if (!userId || !file) throw new Error('userId و file مطلوبان');

  // تحقق من الحجم
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('حجم الصورة يتجاوز 2 ميجابايت');
  }

  // تحقق من النوع
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('نوع الصورة غير مدعوم (JPEG، PNG، WebP فقط)');
  }

  // الامتداد
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  // احذف القديمة (اختياري)
  try {
    const { data: old } = await supabase.storage.from(BUCKET).list(userId);
    if (old?.length) {
      const paths = old.map(f => `${userId}/${f.name}`);
      await supabase.storage.from(BUCKET).remove(paths);
    }
  } catch {}

  // ارفع الجديدة
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  // احصل على الرابط العام
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  // حدّث profiles.avatar_url
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (updateError) throw updateError;

  return publicUrl;
}

// حذف الصورة الرمزية
export async function deleteAvatar(userId) {
  if (!userId) return;

  try {
    const { data: files } = await supabase.storage.from(BUCKET).list(userId);
    if (files?.length) {
      const paths = files.map(f => `${userId}/${f.name}`);
      await supabase.storage.from(BUCKET).remove(paths);
    }

    await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId);
  } catch (err) {
    console.error('deleteAvatar error:', err);
    throw err;
  }
}