import React, { useState } from 'react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { Reveal, StaggerContainer, StaggerItem } from './ui';
import { motion } from 'framer-motion';

export default function Landing({ onEnter }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const features = [
    { icon: '🤖', title: 'دردشة ذكية مع AI', desc: 'اسأل أي سؤال طبي واستلم إجابة مفصلة مبنية على محتوى ملفاتك الدراسية.' },
    { icon: '📚', title: 'ارفع ملفاتك', desc: 'محاضرات، ملخصات، مراجع PDF — رفعها بأمان واستخدمها في الدراسة.' },
    { icon: '🎯', title: 'اختبارات ذكية', desc: 'ولّد أسئلة MCQ تلقائيًا من محتوى ملفاتك، بمستويات صعوبة مختلفة.' },
    { icon: '⏱️', title: 'محاكاة امتحان', desc: 'تجربة امتحان حقيقية بمؤقت وعدد أسئلة كامل — بدون مساعدة.' },
    { icon: '📊', title: 'بنك الأخطاء', desc: 'كل سؤال خاطئ يُحفظ تلقائيًا لتراجعه لاحقًا وترفع مستواك.' },
    { icon: '📈', title: 'تتبع الأداء', desc: 'تقارير أسبوعية + Streak يومي + توصيات ذكية حسب أدائك.' },
  ];

  const steps = [
    { num: '1', title: 'أنشئ حسابك', desc: 'سجّل مجانًا في دقيقة واحدة. بدون بطاقة ائتمان.' },
    { num: '2', title: 'ارفع ملفاتك', desc: 'ارفع محاضراتك ومراجعك. الـ AI سيتعلم منها ويجيب من داخل ملفاتك.' },
    { num: '3', title: 'ابدأ الدراسة', desc: 'اسأل، تدرّب، اختبر نفسك. كل شيء في مكان واحد.' },
  ];

  const faqs = [
    {
      q: 'هل المنصة مجانية بالكامل؟',
      a: 'نعم. حالياً كل الميزات مجانية بالكامل بدون أي رسوم أو بطاقة ائتمان. نخطط لإضافة خطة مدفوعة اختيارية مستقبلاً بميزات إضافية، لكن النسخة الأساسية ستبقى مجانية.',
    },
    {
      q: 'ما الفرق بين هذه المنصة وغيرها؟',
      a: 'الفرق الأساسي هو أن كوتش AI يفهم ملفاتك. عندما ترفع محاضراتك، يجيب الـ AI من داخل ملفاتك بدلاً من معلومات عامة. هذا يعني إجابات أدق وأقرب لمنهجك الحقيقي.',
    },
    {
      q: 'هل تُحفظ ملفاتي بأمان؟',
      a: 'نعم. ملفاتك محفوظة في قاعدة بيانات آمنة (Supabase) بصلاحيات خاصة. فقط أنت من يمكنه رؤيتها. لا يمكن لأي طالب آخر الوصول لملفاتك.',
    },
    {
      q: 'هل المنصة لكل الكليات أم للطب فقط؟',
      a: 'حالياً ندعم كليات الطب البشري، طب الأسنان، والصيدلة. نخطط لإضافة كليات أخرى (هندسة، علوم، آداب) في المستقبل القريب.',
    },
    {
      q: 'كيف يستفيد الطالب من المنصة؟',
      a: 'ثلاث طرق أساسية: (1) اسأل الـ AI عن أي مفهوم صعب، (2) ولّد اختبارات ذكية لتراجع بها، (3) تابع تقدمك أسبوعياً لترى تحسنك.',
    },
    {
      q: 'هل يعمل الموقع على الجوال؟',
      a: 'نعم، بالكامل. صممنا المنصة لتعمل بسلاسة على الجوال والتابلت والحاسوب. يمكنك الدراسة من أي مكان.',
    },
  ];

  return (
    <div className="min-h-screen bg-surface text-content" dir="rtl">

      {/* ═══ Navbar ═══ */}
      <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <Logo size={32} />

            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-content-muted hover:text-content transition-colors">الميزات</a>
              <a href="#how" className="text-sm text-content-muted hover:text-content transition-colors">كيف يعمل</a>
              <a href="#vision" className="text-sm text-content-muted hover:text-content transition-colors">رؤيتنا</a>
              <a href="#team" className="text-sm text-content-muted hover:text-content transition-colors">الفريق</a>
              <a href="#faq" className="text-sm text-content-muted hover:text-content transition-colors">الأسئلة</a>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => onEnter(false)}
                className="hidden sm:block text-sm font-semibold text-content-muted hover:text-content px-4 py-2 rounded-md transition-colors"
              >
                دخول
              </button>
              <button
                onClick={() => onEnter(true)}
                className="text-sm font-semibold bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-md transition-colors"
              >
                ابدأ مجانًا
              </button>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden w-9 h-9 rounded-md border border-border text-content-muted hover:text-content flex items-center justify-center transition-colors"
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="md:hidden py-4 border-t border-border space-y-2">
              {[
                { href: '#features', label: 'الميزات' },
                { href: '#how', label: 'كيف يعمل' },
                { href: '#vision', label: 'رؤيتنا' },
                { href: '#team', label: 'الفريق' },
                { href: '#faq', label: 'الأسئلة' },
              ].map((link, i) => (
                <a
                  key={i}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-sm text-content-muted hover:text-content hover:bg-surface-card transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* ═══ Hero ═══ */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-semibold text-primary mb-6"
        >
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          منصة تعليمية ذكية لطلاب الجامعات السورية
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-4xl md:text-6xl font-bold text-content mb-6 leading-tight tracking-tight"
        >
          ادرس بذكاء،
          <br />
          <span className="text-primary">وتفوّق بمساعدة AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-base md:text-lg text-content-muted max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          كوتش AI يساعدك على رفع ملفاتك، توليد اختبارات ذكية، محاكاة الامتحانات،
          وتتبع تقدمك — كل ذلك في منصة واحدة أنيقة.
          <br className="hidden md:block" />
          <span className="text-content-subtle text-sm">
            صُمّمت لطلاب الطب البشري، طب الأسنان، والصيدلة في سوريا.
          </span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="flex items-center justify-center gap-3 flex-wrap mb-12"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onEnter(true)}
            className="bg-primary hover:bg-primary-light text-white font-semibold px-7 py-3.5 rounded-md transition-colors shadow-sm hover:shadow-md"
          >
            ابدأ مجانًا الآن
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onEnter(false)}
            className="bg-surface-card hover:bg-surface-soft border border-border text-content font-semibold px-7 py-3.5 rounded-md transition-colors"
          >
            تسجيل الدخول
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center justify-center gap-8 md:gap-12 flex-wrap text-sm"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-content tabular-nums">3</div>
            <div className="text-xs text-content-subtle mt-1">كليات مدعومة</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-content tabular-nums">6</div>
            <div className="text-xs text-content-subtle mt-1">ميزات ذكية</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-content">مجاني</div>
            <div className="text-xs text-content-subtle mt-1">بدون بطاقة</div>
          </div>
        </motion.div>
      </section>

      {/* ═══ Features ═══ */}
      <section id="features" className="max-w-6xl mx-auto px-4 md:px-6 py-20 border-t border-border">
        <div className="text-center mb-14">
          <div className="text-xs font-bold text-primary uppercase tracking-wider mb-3">الميزات</div>
          <h2 className="text-3xl md:text-4xl font-bold text-content mb-3">
            كل ما تحتاجه في مكان واحد
          </h2>
          <p className="text-sm text-content-muted max-w-xl mx-auto">
            أدوات ذكية صمّمناها بعناية لترفع مستواك الدراسي بأقل جهد.
          </p>
        </div>

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <StaggerItem key={i}>
              <motion.div
                whileHover={{ y: -4, borderColor: 'rgba(59,130,246,0.4)' }}
                transition={{ duration: 0.2 }}
                className="bg-surface-card border border-border rounded-lg p-6 group h-full"
              >
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center text-2xl mb-4 group-hover:bg-primary/15 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-content mb-2">{f.title}</h3>
                <p className="text-sm text-content-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ═══ How it works ═══ */}
      <section id="how" className="max-w-6xl mx-auto px-4 md:px-6 py-20 border-t border-border">
        <div className="text-center mb-14">
          <div className="text-xs font-bold text-primary uppercase tracking-wider mb-3">كيف يعمل</div>
          <h2 className="text-3xl md:text-4xl font-bold text-content mb-3">
            ابدأ خلال 3 دقائق
          </h2>
          <p className="text-sm text-content-muted max-w-xl mx-auto">
            لا حاجة لتثبيت أي شيء. كل شيء يعمل مباشرة في المتصفح.
          </p>
        </div>

        <StaggerContainer className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <StaggerItem key={i}>
              <div className="flex items-center gap-4 mb-4">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                  className="w-10 h-10 rounded-md bg-primary text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0"
                >
                  {s.num}
                </motion.div>
                <div className="text-xs font-bold text-content-subtle uppercase tracking-wider">
                  الخطوة {s.num}
                </div>
              </div>
              <h3 className="text-base font-bold text-content mb-2">{s.title}</h3>
              <p className="text-sm text-content-muted leading-relaxed">{s.desc}</p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ═══ Vision & Mission ═══ */}
      <section id="vision" className="max-w-6xl mx-auto px-4 md:px-6 py-20 border-t border-border">
        <Reveal>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Vision */}
          <div>
            <div className="text-xs font-bold text-primary uppercase tracking-wider mb-3">رؤيتنا</div>
            <h2 className="text-2xl md:text-3xl font-bold text-content mb-5">
              أن نكون رفيقك الدراسي الذكي في كل خطوة
            </h2>
            <p className="text-sm text-content-muted leading-relaxed mb-4">
              نؤمن أن طلاب الطب في سوريا يستحقون أدوات تعليمية بجودة عالمية. 
              نريد أن نجعل الدراسة أذكى، أسرع، وأكثر متعة.
            </p>
            <p className="text-sm text-content-muted leading-relaxed">
              هدفنا هو تقليل الوقت الضائع في الطرق التقليدية للدراسة، وتمكينك 
              من التركيز على ما يهم فعلاً: فهم الطب، لا حفظه.
            </p>
          </div>

          {/* Mission */}
          <div className="bg-surface-card border border-border rounded-lg p-6 space-y-5">
            <div>
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">رسالتنا</div>
              <ul className="space-y-3 text-sm text-content-muted">
                <li className="flex gap-3">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span>تمكين كل طالب من الاستفادة من الذكاء الاصطناعي في دراسته</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span>توفير أدوات دراسية احترافية مجانية للجميع</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span>احترام خصوصية الطالب وأمان ملفاته</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span>بناء مجتمع تعليمي متعاون في سوريا</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        </Reveal>
      </section>

      {/* ═══ Team ═══ */}
      <section id="team" className="max-w-6xl mx-auto px-4 md:px-6 py-20 border-t border-border">
        <div className="text-center mb-14">
          <div className="text-xs font-bold text-primary uppercase tracking-wider mb-3">الفريق</div>
          <h2 className="text-3xl md:text-4xl font-bold text-content mb-3">
            من يقف خلف كوتش AI؟
          </h2>
          <p className="text-sm text-content-muted max-w-xl mx-auto">
            فريق صغير بشغف كبير — نؤمن بأثر التعليم على مستقبل سوريا.
          </p>
        </div>

        <StaggerContainer className="grid md:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {/* Founder */}
          <StaggerItem className="bg-surface-card border border-border rounded-lg p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-3xl mx-auto mb-4">
              🩺
            </div>
            <div className="text-base font-bold text-content mb-1">
              فريق كوتش AI
            </div>
            <div className="text-xs text-primary font-semibold mb-3">
              المؤسسون والمطورون
            </div>
            <p className="text-xs text-content-muted leading-relaxed">
              طلاب طب سوريون، نعرف التحديات التي تواجهها لأننا نعيشها يومياً.
            </p>
          </StaggerItem>

          {/* Contributors */}
          <div className="bg-surface-card border border-border rounded-lg p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl mx-auto mb-4">
              🤝
            </div>
            <p className="text-base font-bold text-content mb-1">
              المساهمون
            </p>
            <p className="text-xs text-primary font-semibold mb-3">
              طلاب من كل كلية
            </p>
            <p className="text-xs text-content-muted leading-relaxed">
              أصدقاء من الطب، الأسنان، والصيدلة يساهمون بالمحتوى والملاحظات.
            </p>
          </div>

          {/* Community */}
          <div className="bg-surface-card border border-border rounded-lg p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl mx-auto mb-4">
              💙
            </div>
            <div className="text-base font-bold text-content mb-1">
              أنت
            </div>
            <div className="text-xs text-primary font-semibold mb-3">
              جزء من الرحلة
            </div>
            <p className="text-xs text-content-muted leading-relaxed">
              كل ملاحظة، اقتراح، وملف تشاركه يجعل المنصة أفضل للجميع.
            </p>
          </div>
        </StaggerContainer>

        <div className="text-center mt-10">
          <p className="text-xs text-content-subtle">
            💡 هل تريد الانضمام للفريق أو المساهمة؟ تواصل معنا عبر البريد أدناه.
          </p>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="max-w-4xl mx-auto px-4 md:px-6 py-20 border-t border-border">
        <div className="text-center mb-14">
          <div className="text-xs font-bold text-primary uppercase tracking-wider mb-3">الأسئلة الشائعة</div>
          <h2 className="text-3xl md:text-4xl font-bold text-content mb-3">
            عندك سؤال؟ عندنا الجواب
          </h2>
          <p className="text-sm text-content-muted">
            أكثر الأسئلة التي نتلقاها.
          </p>
        </div>

        <StaggerContainer className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <StaggerItem key={i}>
                <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full p-5 flex items-center justify-between gap-4 text-right hover:bg-surface-soft transition-colors"
                  >
                    <span className="text-sm font-semibold text-content flex-1">
                      {f.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-primary text-lg flex-shrink-0"
                    >
                      ▼
                    </motion.span>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{
                      height: isOpen ? 'auto' : 0,
                      opacity: isOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="px-5 pb-5 text-sm text-content-muted leading-relaxed border-t border-border pt-4">
                      {f.a}
                    </div>
                  </motion.div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      {/* ═══ Contact ═══ */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 py-20 border-t border-border">
        <div className="bg-surface-card border border-border rounded-lg p-8 md:p-10 text-center">
          <div className="text-xs font-bold text-primary uppercase tracking-wider mb-3">تواصل معنا</div>
          <h2 className="text-2xl md:text-3xl font-bold text-content mb-3">
            عندك اقتراح أو استفسار؟
          </h2>
          <p className="text-sm text-content-muted mb-8 max-w-md mx-auto">
            نرحب بأي ملاحظة تساعدنا نطوّر المنصة. تواصل معنا وسنرد في أقرب وقت.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="mailto:contact@coach-ai.com"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold px-6 py-3 rounded-md transition-colors"
            >
              <span>📧</span>
              <span>راسلنا</span>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 bg-surface-soft border border-border text-content hover:border-content-subtle font-semibold px-6 py-3 rounded-md transition-colors"
            >
              <span>💬</span>
              <span>قناة تلغرام</span>
            </a>
          </div>
        </div>
      </section>

      {/* ═══ Final CTA ═══ */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-20 border-t border-border">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-content mb-4">
            جاهز للبدء؟
          </h2>
          <p className="text-sm text-content-muted mb-8 max-w-md mx-auto">
            انضم لزملائك وابدأ رحلتك الدراسية مع AI.
          </p>
          <button
            onClick={() => onEnter(true)}
            className="bg-primary hover:bg-primary-light text-white font-semibold px-8 py-4 rounded-md transition-all shadow-sm hover:shadow-md"
          >
            ابدأ مجانًا الآن
          </button>
          <p className="text-xs text-content-subtle mt-4">
            بدون بطاقة ائتمان • تسجيل في دقيقة
          </p>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo size={28} />
              <span className="text-xs text-content-muted">
                © 2026 — منصة تعليمية ذكية
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs text-content-muted flex-wrap">
              <a href="#features" className="hover:text-content transition-colors">الميزات</a>
              <a href="#how" className="hover:text-content transition-colors">كيف يعمل</a>
              <a href="#vision" className="hover:text-content transition-colors">رؤيتنا</a>
              <a href="#team" className="hover:text-content transition-colors">الفريق</a>
              <a href="#faq" className="hover:text-content transition-colors">الأسئلة</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}