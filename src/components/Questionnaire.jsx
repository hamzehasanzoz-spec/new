import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SECTIONS = [
  { id: 'basic',  title: 'معلوماتك الأساسية',  icon: '👤' },
  { id: 'time',   title: 'وقتك وأهدافك',       icon: '⏰' },
  { id: 'level',  title: 'مستواك وموادك',      icon: '📊' },
  { id: 'study',  title: 'أسلوب دراستك',       icon: '📚' },
  { id: 'env',    title: 'بيئتك وعوائقك',      icon: '🌍' },
  { id: 'ai',     title: 'تفضيلاتك مع AI',     icon: '🤖' },
];

const LEVELS = ['ضعيف', 'متوسط', 'جيد', 'ممتاز'];

// ─────────────────────────────────────────────
// مكوّنات مساعدة
// ─────────────────────────────────────────────

function Field({ label, hint, required, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display:'block', fontWeight:'bold', marginBottom:6, color:'var(--text)' }}>
        {label} {required && <span style={{ color:'#EF4444' }}>*</span>}
      </label>
      {hint && <p style={{ color:'var(--text-muted)', fontSize:'0.82em', margin:'0 0 8px 0' }}>{hint}</p>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width:'100%', padding:11, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-soft)', color:'var(--text)', fontSize:'0.95em' }}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ width:'100%', padding:11, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-soft)', color:'var(--text)', fontSize:'0.95em', resize:'vertical', fontFamily:'inherit' }}
    />
  );
}

function RadioGroup({ options, value, onChange, columns = 2 }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${columns}, 1fr)`, gap:8 }}>
      {options.map(opt => (
        <label key={opt} style={{
          display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
          background: value === opt ? 'var(--primary)' : 'var(--bg-soft)',
          border: value === opt ? '2px solid var(--primary)' : '1px solid var(--border)',
          borderRadius:8, cursor:'pointer', fontSize:'0.9em', color: value === opt ? '#fff' : 'var(--text)'
        }}>
          <input type="radio" checked={value === opt} onChange={() => onChange(opt)} />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

function CheckGroup({ options, values = [], onChange, columns = 2 }) {
  const toggle = (opt) => {
    onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]);
  };
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${columns}, 1fr)`, gap:8 }}>
      {options.map(opt => (
        <label key={opt} style={{
          display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
          background: values.includes(opt) ? 'var(--primary)' : 'var(--bg-soft)',
          border: values.includes(opt) ? '2px solid var(--primary)' : '1px solid var(--border)',
          borderRadius:8, cursor:'pointer', fontSize:'0.9em', color: values.includes(opt) ? '#fff' : 'var(--text)'
        }}>
          <input type="checkbox" checked={values.includes(opt)} onChange={() => toggle(opt)} />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// المكوّن الرئيسي
// ─────────────────────────────────────────────

export default function Questionnaire({ session, onComplete }) {
  const [currentSection, setCurrentSection] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // جلب المواد ديناميكياً
  const [faculties, setFaculties] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [fetchingData, setFetchingData] = useState(true);

  const [data, setData] = useState({
    full_name: '', current_stage: '', university: '',
    faculty_slug: '', faculty_name: '', year: '',
    exam_type: '', target_subjects: [],
    daily_hours: '', weekly_hours: '', preferred_times: [],
    score_goal: '', subject_levels: {},
    hardest_subjects: [{ subject:'', reason:'' }, { subject:'', reason:'' }, { subject:'', reason:'' }],
    confusing_question_types: [], study_methods: [], understanding_methods: [],
    preferred_language: '', use_english_terms: true, available_resources: [], internet_access: '', study_location: '',
    biggest_obstacles: [], review_style: '', plan_preference: '', ai_help_needs: [],
    wants_quizzes: false, quiz_question_count: 5, quiz_feedback_style: '', progress_measurement: [], special_conditions: '',
  });

  // 1. جلب الكليات عند فتح الصفحة
  useEffect(() => {
    const fetchFaculties = async () => {
      const { data: facData } = await supabase.from('faculties').select('*');
      if (facData) setFaculties(facData);
      setFetchingData(false);
    };
    fetchFaculties();
  }, []);

  // 2. جلب المواد عند اختيار الكلية والسنة
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!data.faculty_slug || !data.year) {
        setSubjects([]);
        return;
      }
      
      // نبحث عن الـ faculty_id بناءً على الـ slug
      const selectedFaculty = faculties.find(f => f.slug === data.faculty_slug);
      if (!selectedFaculty) return;

      // جلب المواد من جدول subjects بناءً على الـ faculty_id والسنة
      // ملاحظة: في قاعدة بياناتك، specialty_id هو الذي يربط المادة بالكلية
      const { data: subjData, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('specialty_id', selectedFaculty.id)
        .eq('year', parseInt(data.year));

      if (subjData && !error) {
        setSubjects(subjData.map(s => s.name)); // نأخذ أسماء المواد فقط
      } else {
        console.error('Error fetching subjects:', error);
        setSubjects([]);
      }
    };
    fetchSubjects();
  }, [data.faculty_slug, data.year, faculties]);

  const upd = (key, value) => setData(prev => ({ ...prev, [key]: value }));

  const setSubjectLevel = (subject, level) => {
    upd('subject_levels', { ...data.subject_levels, [subject]: level });
  };

  const next = () => setCurrentSection(s => Math.min(s + 1, SECTIONS.length - 1));
  const prev = () => setCurrentSection(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!data.full_name) { alert('الرجاء إدخال الاسم'); setCurrentSection(0); return; }
    if (!data.faculty_slug) { alert('الرجاء اختيار الكلية'); setCurrentSection(0); return; }
    if (!data.year) { alert('الرجاء اختيار السنة الدراسية'); setCurrentSection(0); return; }
    
    setLoading(true);
    try {
      const selectedFaculty = faculties.find(f => f.slug === data.faculty_slug);
      
      const payload = {
        id: session.user.id,
        ...data,
        faculty_name: selectedFaculty?.name || '',
        subject_levels: Object.fromEntries(Object.entries(data.subject_levels).filter(([_, v]) => v)),
        questionnaire_completed: true,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) throw error;
      if (onComplete) onComplete();
    } catch (err) {
      alert('خطأ في الحفظ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const section = SECTIONS[currentSection];

  // ─────────────────────────────────────────
  // محتوى كل قسم
  // ─────────────────────────────────────────

  const renderSection = () => {
    switch (section.id) {

      // ========== 1. معلومات أساسية ==========
      case 'basic': return (
        <>
          <Field label="ما اسمك الكامل؟" required>
            <TextInput value={data.full_name} onChange={v => upd('full_name', v)} placeholder="الاسم الثلاثي" />
          </Field>

          <Field label="اختر كليتك" required>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {faculties.map(f => (
                <button key={f.slug} type="button" onClick={() => upd('faculty_slug', f.slug)}
                  style={{ padding:12, borderRadius:8, border: data.faculty_slug === f.slug ? '2px solid var(--primary)' : '1px solid var(--border)', background: data.faculty_slug === f.slug ? 'var(--primary)' : 'var(--bg-soft)', color: data.faculty_slug === f.slug ? '#fff' : 'var(--text)', cursor:'pointer', fontWeight:'bold' }}>
                  {f.name}
                </button>
              ))}
            </div>
          </Field>

          <Field label="اختر سنتك الدراسية" required>
            <RadioGroup
              options={['1', '2', '3', '4', '5', '6']}
              value={data.year}
              onChange={v => upd('year', v)}
              columns={6}
            />
          </Field>

          <Field label="ما اسم جامعتك؟" required>
            <TextInput value={data.university} onChange={v => upd('university', v)} placeholder="مثال: جامعة دمشق، جامعة حلب..." />
          </Field>
        </>
      );

      // ========== 2. الوقت والأهداف ==========
      case 'time': return (
        <>
          <Field label="كم ساعة دراسة فعالة تقدر تدرس يوميًا؟" required hint="ساعات التركيز الفعلي وليس الجلوس">
            <RadioGroup
              options={['أقل من ساعة', '1-2 ساعة', '3-4 ساعات', '5-6 ساعات', 'أكثر من 6 ساعات']}
              value={data.daily_hours}
              onChange={v => upd('daily_hours', v)}
              columns={2}
            />
          </Field>

          <Field label="وكم ساعة أسبوعيًا؟" required>
            <RadioGroup
              options={['أقل من 10', '10-20', '20-30', '30-40', 'أكثر من 40']}
              value={data.weekly_hours}
              onChange={v => upd('weekly_hours', v)}
              columns={2}
            />
          </Field>

          <Field label="ما أفضل أوقاتك للدراسة؟" hint="يمكنك اختيار أكثر من وقت">
            <CheckGroup
              options={['صباحًا مبكرًا (5-8)', 'صباحًا (8-12)', 'بعد الظهر (12-5)', 'مساءً (5-9)', 'ليلًا (9-12)', 'بعد منتصف الليل']}
              values={data.preferred_times}
              onChange={v => upd('preferred_times', v)}
              columns={2}
            />
          </Field>

          <Field label="ما هدفك من العلامة؟" required>
            <RadioGroup
              options={['نجاح فقط', 'معدل جيد', 'ترتيب عالي', 'اختصاص معين', 'المنافسة على المراكز الأولى']}
              value={data.score_goal}
              onChange={v => upd('score_goal', v)}
              columns={2}
            />
          </Field>
        </>
      );

      // ========== 3. المستوى والمواد ==========
      case 'level': return (
        <>
          <Field label={`كيف تقيّم مستواك في مواد ${data.faculty_name || 'كليتك'} للسنة ${data.year}؟`} hint="قيّم فقط المواد التي تظهر أدناه، واترك الباقي فارغًا">
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:8 }}>
              {subjects.length > 0 ? subjects.map(subj => (
                <div key={subj} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--bg-soft)', borderRadius:8, flexWrap:'wrap' }}>
                  <span style={{ minWidth:140, fontWeight:'bold', fontSize:'0.9em', color:'var(--text)' }}>{subj}</span>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {LEVELS.map(lvl => (
                      <button key={lvl} type="button" onClick={() => setSubjectLevel(subj, lvl)}
                        style={{ padding:'6px 12px', borderRadius:6, fontSize:'0.85em', cursor:'pointer', border: data.subject_levels[subj] === lvl ? '2px solid var(--primary)' : '1px solid var(--border)', background: data.subject_levels[subj] === lvl ? 'var(--primary)' : 'var(--bg)', color: data.subject_levels[subj] === lvl ? '#fff' : 'var(--text)' }}>
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )) : (
                <p style={{ color:'var(--text-muted)', textAlign:'center', padding: '20px 0' }}>
                  {data.faculty_slug && data.year ? 'لا توجد مواد مسجلة لهذه السنة، أو جاري التحميل...' : 'الرجاء العودة للخطوة الأولى واختيار الكلية والسنة.'}
                </p>
              )}
            </div>
          </Field>

          <Field label="ما أصعب 3 مواد أو فصول عندك؟ وليش؟" hint="اكتب المادة + السبب بإيجاز">
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:8 }}>
                  <TextInput
                    value={data.hardest_subjects[i]?.subject}
                    onChange={v => {
                      const arr = [...data.hardest_subjects];
                      arr[i] = { ...arr[i], subject: v };
                      upd('hardest_subjects', arr);
                    }}
                    placeholder={`المادة ${i+1}`}
                  />
                  <TextInput
                    value={data.hardest_subjects[i]?.reason}
                    onChange={v => {
                      const arr = [...data.hardest_subjects];
                      arr[i] = { ...arr[i], reason: v };
                      upd('hardest_subjects', arr);
                    }}
                    placeholder="السبب (حفظ / فهم / ربط سريري / أسئلة...)"
                  />
                </div>
              ))}
            </div>
          </Field>
        </>
      );

      // ========== 4. أسلوب الدراسة ==========
      case 'study': return (
        <>
          <Field label="كيف تدرس عادة؟" hint="اختر كل ما ينطبق">
            <CheckGroup
              options={['قراءة مباشرة من الكتاب', 'تلخيص بنفسي', 'بطاقات مراجعة (Flashcards)', 'مشاهدة فيديوهات', 'حل أسئلة ودورات', 'شرح لغيري', 'الدراسة الجماعية']}
              values={data.study_methods}
              onChange={v => upd('study_methods', v)}
              columns={2}
            />
          </Field>

          <Field label="شو أفضل طريقة تفهم فيها؟" hint="اختر ما يثبّت المعلومة عندك">
            <CheckGroup
              options={['شرح مبسط بالكلام', 'مخططات (Flowcharts)', 'جداول مقارنة', 'أمثلة سريرية', 'مقارنات (مثل X vs Y)', 'منمنمات ورسوم', 'خوارزميات قرار']}
              values={data.understanding_methods}
              onChange={v => upd('understanding_methods', v)}
              columns={2}
            />
          </Field>

          <Field label="بأي لغة تفضل الشرح؟">
            <RadioGroup
              options={['عربي', 'إنجليزي', 'مزيج (عربي + إنجليزي)']}
              value={data.preferred_language}
              onChange={v => upd('preferred_language', v)}
              columns={3}
            />
          </Field>

          <Field label="شو المصادر المتوفرة عندك؟">
            <CheckGroup
              options={['كتب مرجعية (Harrison, Bailey...)', 'ملخصات جاهزة', 'بنوك أسئلة (Past papers)', 'فيديوهات تعليمية', 'تطبيقات وقنوات تلغرام', 'دورات مدفوعة', 'مصادر الجامعة فقط']}
              values={data.available_resources}
              onChange={v => upd('available_resources', v)}
              columns={2}
            />
          </Field>
        </>
      );

      // ========== 5. البيئة والعوائق ==========
      case 'env': return (
        <>
          <Field label="هل الإنترنت والجهاز متاحان دائمًا؟">
            <RadioGroup
              options={['نعم، دائمًا', 'أحيانًا، ينقطع', 'الإنترنت ضعيف', 'لا يوجد اتصال مستقر']}
              value={data.internet_access}
              onChange={v => upd('internet_access', v)}
              columns={2}
            />
          </Field>

          <Field label="شو أكبر عائق بيواجهك؟" hint="اختر حتى 3 عوائق">
            <CheckGroup
              options={['التشتت وعدم التركيز', 'النسيان السريع', 'ضيق الوقت', 'الإرهاق الجسدي', 'القلق والتوتر', 'الملل', 'ضغط الأهل', 'عدم وجود بيئة مناسبة', 'كثرة المصادر وعدم وضوح الوجهة']}
              values={data.biggest_obstacles}
              onChange={v => upd('biggest_obstacles', v)}
              columns={2}
            />
          </Field>

          <Field label="كيف تتعامل مع المراجعة والنسيان؟">
            <RadioGroup
              options={['نظام يومي منظم', 'نظام أسبوعي', 'مراجعة عشوائية', 'ما عندي نظام واضح']}
              value={data.review_style}
              onChange={v => upd('review_style', v)}
              columns={2}
            />
          </Field>
        </>
      );

      // ========== 6. تفضيلات AI ==========
      case 'ai': return (
        <>
          <Field label="تفضل خطة صارمة أم مرنة؟">
            <RadioGroup
              options={['صارمة (التزام يومي)', 'مرنة (تتكيف معي)', 'مزيج بينهما']}
              value={data.plan_preference}
              onChange={v => upd('plan_preference', v)}
              columns={3}
            />
          </Field>

          <Field label="كيف تريد أن يساعدك الذكاء الاصطناعي؟" hint="اختر كل ما تحتاجه">
            <CheckGroup
              options={['شرح المفاهيم الصعبة', 'تلخيص الفصول', 'طرح أسئلة عليّ', 'تصحيح إجاباتي', 'إعداد جدول دراسي', 'تحفيزي ومتابعة', 'محاكاة امتحان حقيقي', 'ربط سريري (Clinical cases)']}
              values={data.ai_help_needs}
              onChange={v => upd('ai_help_needs', v)}
              columns={2}
            />
          </Field>

          <Field label="هل تريد اختبارات قصيرة بعد كل جلسة؟">
            <RadioGroup
              options={['نعم', 'لا', 'أحيانًا']}
              value={data.wants_quizzes ? 'نعم' : 'لا'}
              onChange={v => upd('wants_quizzes', v === 'نعم')}
              columns={3}
            />
          </Field>

          {data.wants_quizzes && (
            <>
              <Field label="كم سؤال تريد في كل اختبار قصير؟">
                <RadioGroup
                  options={['3', '5', '10', '15', '20+']}
                  value={String(data.quiz_question_count)}
                  onChange={v => upd('quiz_question_count', parseInt(v))}
                  columns={5}
                />
              </Field>

              <Field label="كيف تريد التصحيح؟">
                <RadioGroup
                  options={['فوري (صح/خطأ)', 'مفصل (شرح لكل خيار)', 'مفصل + مرجع']}
                  value={data.quiz_feedback_style}
                  onChange={v => upd('quiz_feedback_style', v)}
                  columns={1}
                />
              </Field>
            </>
          )}

          <Field label="كيف تريد قياس تقدمك؟" hint="اختر الطرق المناسبة">
            <CheckGroup
              options={['نسبة الإنجاز اليومية', 'درجات الاختبارات', 'ثبات المراجعة (Streak)', 'تقليل الأخطاء', 'الوقت المستغرق']}
              values={data.progress_measurement}
              onChange={v => upd('progress_measurement', v)}
              columns={2}
            />
          </Field>

          <Field label="هل عندك ظروف خاصة أو تفضيلات للتنبيهات؟" hint="اختياري: عمل / مرض / سفر / عائلة / وقت تذكير / مكافآت">
            <TextArea
              value={data.special_conditions}
              onChange={v => upd('special_conditions', v)}
              placeholder="اكتب أي شيء تريد أن يعرفه المدرب الذكي عنك..."
              rows={3}
            />
          </Field>
        </>
      );

      default: return null;
    }
  };

  if (fetchingData) {
    return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text)' }}>جاري تحميل البيانات...</div>;
  }

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <div style={{ maxWidth:700, margin:'30px auto', padding:'25px', background:'var(--bg-card)', borderRadius:16, boxShadow:'0 4px 20px rgba(0,0,0,0.1)', direction:'rtl' }}>

      {/* رأس الصفحة */}
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <h2 style={{ color:'var(--primary)', margin:'0 0 8px' }}>استبيان كوتش AI 🩺</h2>
        <p style={{ color:'var(--text-muted)', margin:0, fontSize:'0.9em' }}>
          المرحلة {currentSection + 1} من {SECTIONS.length} — {section.title}
        </p>
      </div>

      {/* شريط التقدم */}
      <div style={{ display:'flex', gap:6, marginBottom:24 }}>
        {SECTIONS.map((s, i) => (
          <div key={s.id} style={{
            flex:1, height:6, borderRadius:99,
            background: i <= currentSection ? 'var(--primary)' : 'var(--border)',
            transition:'background 0.3s'
          }} />
        ))}
      </div>

      {/* محتوى القسم */}
      <div style={{ minHeight:300 }}>
        {renderSection()}
      </div>

      {/* أزرار التنقل */}
      <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginTop:30, paddingTop:20, borderTop:'1px solid var(--border)' }}>
        <button
          type="button"
          onClick={prev}
          disabled={currentSection === 0}
          style={{
            padding:'12px 24px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-soft)',
            color: currentSection === 0 ? 'var(--text-subtle)' : 'var(--text)',
            cursor: currentSection === 0 ? 'not-allowed' : 'pointer', fontWeight:'bold'
          }}
        >← السابق</button>

        {currentSection < SECTIONS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            style={{ padding:'12px 32px', borderRadius:8, border:'none', background:'var(--primary)', color:'#fff', cursor:'pointer', fontWeight:'bold' }}
          >التالي →</button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding:'12px 32px', borderRadius:8, border:'none', background:'#10B981', color:'#fff', cursor:'pointer', fontWeight:'bold' }}
          >{loading ? 'جاري الحفظ...' : 'حفظ وبدء الرحلة 🚀'}</button>
        )}
      </div>
    </div>
  );
}