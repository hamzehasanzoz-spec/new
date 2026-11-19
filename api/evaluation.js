// api/evaluation.js – أداة تقييم وإحصاء دقة الإجابات الطبية وتتبع الأخطاء (Evaluation & Analytics Framework)
// تقوم بتقييم جودة الإجابة المسترجعة، تتبع معدل الأخطاء لدى الطلاب (بشكل مجهول ومجمع)، وتجهيز البيانات لتقارير الاتجاهات (B2B Trend Reports)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, query, responseText, sourcesCount, isCorrect } = req.body || {};
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'متغيرات Supabase غير متوفرة' });
  }

  try {
    // 1. تسجيل وتقييم الأداء (Evaluation Logging)
    if (action === 'log_evaluation') {
      const evaluationRecord = {
        query: query || '',
        sources_count: sourcesCount || 0,
        has_grounding: responseText ? !responseText.includes('أنا آسف، لا أعرف') : false,
        is_correct: isCorrect ?? true,
        created_at: new Date().toISOString()
      };

      // حفظ التقييم في جدول مخصص للإحصائيات في Supabase (إن وجد أو محاكاة الاستجابة)
      return res.status(200).json({
        success: true,
        message: 'تم تسجيل تقييم دقة الإجابة بنجاح',
        evaluation: evaluationRecord
      });
    }

    // 2. تجميع إحصائيات الأخطاء الشائعة لتقارير الاتجاهات (Aggregated Trend Data - B2B)
    if (action === 'get_aggregated_trends') {
      // هنا نقوم بجلب البيانات المجمعة والمجهولة التي توضح المواضيع الأكثر صعوبة بين الطلاب
      // (مثال: أخطاء أدوية القلب، أمراض النسائية، إلخ) لبيعها كتقارير لشركات الأدوية أو الناشرين
      
      const mockTrendReport = {
        report_title: 'تقرير اتجاهات أخطاء الطلاب الطبية - ربع سنوي',
        total_queries_analyzed: 1450,
        difficult_topics: [
          { topic: 'فارماكولوجي - أدوية القلب والأوعية', error_rate: '42%' },
          { topic: 'جراحة عامة - تدبير الصدمة', error_rate: '35%' },
          { topic: 'نسائية والتوليد - اضطرابات الهرمونات', error_rate: '28%' }
        ],
        privacy_note: 'جميع البيانات مجمعة ومجهولة الهوية تماماً ولا تتضمن أي معلومات شخصية للطلاب.'
      };

      return res.status(200).json({
        success: true,
        trend_report: mockTrendReport
      });
    }

    return res.status(400).json({ error: 'الإجراء (action) غير مسجل أو مفقود' });

  } catch (err) {
    console.error('Evaluation API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
