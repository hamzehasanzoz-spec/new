export default function handler(req, res) {
  const key = process.env.VOYAGE_API_KEY;
  const supaUrl = process.env.VITE_SUPABASE_URL;
  const supaKey = process.env.VITE_SUPABASE_ANON_KEY;

  return res.status(200).json({
    voyage: {
      exists: !!key,
      prefix: key ? key.substring(0, 6) : null,
      length: key ? key.length : 0,
      hasSpaces: key ? (key !== key.trim()) : false,
      hasNewline: key ? key.includes('\n') : false,
    },
    supabaseUrl: {
      exists: !!supaUrl,
      value: supaUrl ? supaUrl.substring(0, 30) : null,
    },
    supabaseKey: {
      exists: !!supaKey,
      prefix: supaKey ? supaKey.substring(0, 10) : null,
    },
  });
}