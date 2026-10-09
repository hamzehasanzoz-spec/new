import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const SECTIONS = [
  { id: 'basic',  title: 'معلوماتك الأساسية',  icon: '👤' },
  { id: 'time',   title: 'وقتك وأهدافك',       icon: '⏰' },
  { id: 'level',  title: 'مستواك وموادك',      icon: '📊' },
  { id: 'study',  title: 'أسلوب دراستك',       icon: '📚' },
  { id: 'env',    title: 'بيئتك وعوائقك',      icon: '🌍' },
  { id: 'ai',     title: 'تفضيلاتك مع AI',     icon: '🤖' },
];

const SUBJECTS = [
  'الداخلية العصبية', 'الداخلية القلبية', 'الداخلية الهضمية', 'الداخلية الصدرية',
  'الجراحة العامة', 'الجراحة العصبية', 'الجراحة القلبية',
  'الأطفال', 'النسائية والتوليد',
  'الفارماكولوجي', 'الباثولوجي', 'المايكروبيولوجي', 'الفيزيولوجي', 'التشريح',
  'الأنسجة', 'الطفيليات', 'الطب الشرعي', 'السموم', 'العينية', 'الجلدية',
];

const LEVELS = ['ضعيف', 'متوسط', 'جيد', 'ممتاز'];

// ─────────────────────────────────────────────
// مكوّنات مساعدة
// ─────────────────────────────────────────────

function Field({ label, hint, required, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display:'block', fontWeight:'bold', marginBottom:6, color:'#1E293B' }}>
        {label} {required && <span style={{ color:'#EF4444' }}>*</span>}
      </label>
      {hint && <p style={{ color:'#64748B', fontSize:'0.82em', margin:'0 0 8px 0' }}>{hint}</p>}
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
      style={{ width:'100%', padding:11, borderRadius:8, border:'1px solid #CBD5E1', fontSize:'0.95em' }}
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
      style={{ width:'100%', padding:11, borderRadius:8, border:'1px solid #CBD5E1', fontSize:'0.95em', resize:'vertical', fontFamily:'inherit' }}
    />
  );
}

function RadioGroup({ options, value, onChange, columns = 2 }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${columns}, 1fr)`, gap:8 }}>
      {options.map(opt => (
        <label key={opt} style={{
          display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
          background: value === opt ? '#EFF6FF' : '#F8FAFC',
          border: value === opt ? '2px solid #2A5C82' : '1px solid #E2E8F0',
          borderRadius:8, cursor:'pointer', fontSize:'0.9em'
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
          background: values.includes(opt) ? '#EFF6FF' : '#F8FAFC',
          border: values.includes(opt) ? '2px solid #2A5C82' : '1px solid #E2E8F0',
          borderRadius:8, cursor:'pointer', fontSize:'0.9em'
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

export default function Questionnaire({ session, onComplete, initialData = null }) {
  const [currentSection, setCurrentSection] = useState(0);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState(initialData || {
    full_name: '', current_stage: '', university: '',
    exam_type: '', target_subjects: [],
    daily_hours: '', weekly_hours: '', preferred_times: [],
    score_goal: '',
    subject_levels: {},
    hardest_subjects: [{ subject:'', reason:'' }, { subject:'', reason:'' }, { subject:'', reason:'' }],
    difficulty_reasons: [],
    confusing_question_types: [],
    study_methods: [], understanding_methods: [],
    preferred_language: '', use_english_terms: true,
    available_resources: [], internet_access: '', study_location: '',
    biggest_obstacles: [], review_style: '', plan_preference: '',
    ai_help_needs: [], wants_quizzes: false, quiz_question_count: 5, quiz_feedback_style: '',
    progress_measurement: [], special_conditions: '',
  });

  const upd = (key, value) => setData(prev => ({ ...prev, [key]: value }));

  // حفظ المستوى لكل مادة
  const setSubjectLevel = (subject, level) => {
    upd('subject_levels', { ...data.subject_levels, [subject]: level });
  };

  const next = () => setCurrentSection(s => Math.min(s + 1, SECTIONS.length - 1));
  const prev = () => setCurrentSection(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!data.full_name) { alert('الرجاء إدخال الاسم'); setCurrentSection(0); return; }
    setLoading(true);
    try {
      const payload = {
        id: session.user.id,
        ...data,
        // نحذف أي مواد لم يتم تحديد مستواها
        subject_levels: Object.fromEntries(
          Object.entries(data.subject_levels).filter(([_, v]) => v)
        ),
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

          <Field label="ما مرحلتك الحالية؟" required hint="اختر واحدة">
            <RadioGroup
              options={['سنة رابعة', 'سنة خامسة', 'متخرج', 'إعادة']}
              value={data.current_stage}
              onChange={v => upd('current_stage', v)}
            />
          </Field>

          <Field label="ما اسم جامعتك؟" required>
            <TextInput value={data.university} onChange={v => upd('university', v)} placeholder="مثال: جامعة دمشق، جامعة حلب..." />
          </Field>

          <Field label="هل الامتحان الذي تستعد له هو الوطني السوري؟" required>
            <RadioGroup
              options={['نعم، الوطني السوري', 'لا، امتحان آخر', 'الوطني + امتحان آخر']}
              value={data.exam_type}
              onChange={v => upd('exam_type', v)}
              columns={1}
            />
          </Field>

          <Field label="ما المواد أو المحاور المقررة عليك بالضبط؟" hint="اختر كل ما ينطبق (يمكنك اختيار عدة مواد)">
            <CheckGroup
              options={SUBJECTS}
              values={data.target_subjects}
              onChange={v => upd('target_subjects', v)}
              columns={3}
            />
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
          <Field label="كيف تقيّم مستواك الحالي في كل مادة؟" hint="قيّم فقط المواد التي حددتها سابقًا، واترك الباقي فارغًا">
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:8 }}>
              {(data.target_subjects.length > 0 ? data.target_subjects : SUBJECTS.slice(0, 8)).map(subj => (
                <div key={subj} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'#F8FAFC', borderRadius:8, flexWrap:'wrap' }}>
                  <span style={{ minWidth:140, fontWeight:'bold', fontSize:'0.9em' }}>{subj}</span>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {LEVELS.map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSubjectLevel(subj, lvl)}
                        style={{
                          padding:'6px 12px', borderRadius:6, fontSize:'0.85em', cursor:'pointer',
                          border: data.subject_levels[subj] === lvl ? '2px solid #2A5C82' : '1px solid #E2E8F0',
                          background: data.subject_levels[subj] === lvl ? '#2A5C82' : '#fff',
                          color: data.subject_levels[subj] === lvl ? '#fff' : '#1E293B',
                        }}
                      >{lvl}</button>
                    ))}
                  </div>
                </div>
              ))}
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

          <Field label="ما نوع الأسئلة اللي يربكك؟" hint="يمكنك اختيار أكثر من نوع">
            <CheckGroup
              options={['MCQ', 'حالات سريرية', 'أسئلة صور', 'تشخيص تفريقي', 'أسئلة أرقام وجرعات', 'أسئلة المقارنة', 'أسئلة متعددة الإجابات']}
              values={data.confusing_question_types}
              onChange={v => upd('confusing_question_types', v)}
              columns={2}
            />
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

          <Field label="هل تفضّل أن تكون المصطلحات الطبية بالإنجليزية؟">
            <RadioGroup
              options={['نعم دائمًا', 'فقط عند الضرورة', 'لا، عرّبها']}
              value={data.use_english_terms ? 'نعم دائمًا' : 'لا، عرّبها'}
              onChange={v => upd('use_english_terms', v === 'نعم دائمًا')}
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

          <Field label="هل تدرس أونلاين أم أوفلاين؟">
            <RadioGroup
              options={['أونلاين أساسًا', 'أوفلاين أساسًا', 'الاثنان معًا']}
              value={data.study_location}
              onChange={v => upd('study_location', v)}
              columns={3}
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

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <div style={{ maxWidth:700, margin:'30px auto', padding:'25px', background:'#fff', borderRadius:16, boxShadow:'0 4px 20px rgba(0,0,0,0.05)', direction:'rtl' }}>

      {/* رأس الصفحة */}
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <h2 style={{ color:'#2A5C82', margin:'0 0 8px' }}>استبيان كوتش AI 🩺</h2>
        <p style={{ color:'#64748B', margin:0, fontSize:'0.9em' }}>
          المرحلة {currentSection + 1} من {SECTIONS.length} — {section.title}
        </p>
      </div>

      {/* شريط التقدم */}
      <div style={{ display:'flex', gap:6, marginBottom:24 }}>
        {SECTIONS.map((s, i) => (
          <div key={s.id} style={{
            flex:1, height:6, borderRadius:99,
            background: i <= currentSection ? '#2A5C82' : '#E2E8F0',
            transition:'background 0.3s'
          }} />
        ))}
      </div>

      {/* محتوى القسم */}
      <div style={{ minHeight:300 }}>
        {renderSection()}
      </div>

      {/* أزرار التنقل */}
      <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginTop:30, paddingTop:20, borderTop:'1px solid #E2E8F0' }}>
        <button
          type="button"
          onClick={prev}
          disabled={currentSection === 0}
          style={{
            padding:'12px 24px', borderRadius:8, border:'1px solid #E2E8F0', background:'#fff',
            color: currentSection === 0 ? '#CBD5E1' : '#1E293B',
            cursor: currentSection === 0 ? 'not-allowed' : 'pointer', fontWeight:'bold'
          }}
        >← السابق</button>

        {currentSection < SECTIONS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            style={{ padding:'12px 32px', borderRadius:8, border:'none', background:'#2A5C82', color:'#fff', cursor:'pointer', fontWeight:'bold' }}
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
