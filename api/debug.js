export default function handler(req, res) {
  const voyageKey = process.env.VOYAGE_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  // لا تعرض القيم الكاملة لأسباب أمنية، فقط وجودها وبعض التفاصيل
  return res.status(200).json({
    voyageKey: {
      exists: !!voyageKey,
      prefix: voyageKey ? voyageKey.substring(0, 6) : null,
      length: voyageKey ? voyageKey.length : 0,
      hasSpaces: voyageKey ? (voyageKey !== voyageKey.trim()) : null,
      hasNewline: voyageKey ? voyageKey.includes('\n') : null,
    },
    supabaseUrl: {
      exists: !!supabaseUrl,
      value: supabaseUrl ? supabaseUrl.substring(0, 30) : null,
    },
    supabaseAnonKey: {
      exists: !!supabaseAnonKey,
      prefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) : null,
    },
  });
}