import React, { useState } from 'react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { Reveal, StaggerContainer, StaggerItem } from './ui';
import { motion } from 'framer-motion';
import { 
  MessageSquare, BookOpen, Target, Clock, AlertCircle, TrendingUp, 
  CheckCircle2, Shield, HelpCircle, Mail, Send 
} from 'lucide-react';

export default function Landing({ onEnter }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const features = [
    { icon: <MessageSquare size={24} />, title: 'دردشة ذكية مع AI', desc: 'اسأل أي سؤال طبي واستلم إجابة مفصلة مبنية على محتوى ملفاتك الدراسية.' },
    { icon: <BookOpen size={24} />, title: 'ارفع ملفاتك', desc: 'محاضرات، ملخصات، مراجع PDF — رفعها بأمان واستخدمها في الدراسة.' },
    { icon: <Target size={24} />, title: 'اختبارات ذكية', desc: 'ولّد أسئلة MCQ تلقائيًا من محتوى ملفاتك، بمستويات صعوبة مختلفة.' },
    { icon: <Clock size={24} />, title: 'محاكاة امتحان', desc: 'تجربة امتحان حقيقية بمؤقت وعدد أسئلة كامل — بدون مساعدة.' },
    { icon: <AlertCircle size={24} />, title: 'بنك الأخطاء', desc: 'كل سؤال خاطئ يُحفظ تلقائيًا لتراجعه لاحقًا وترفع مستواك.' },
    { icon: <TrendingUp size={24} />, title: 'تتبع الأداء', desc: 'تقارير أسبوعية + Streak يومي + توصيات ذكية حسب أدائك.' },
  ];

  return (
    <div className="min-h-screen bg-surface text-content" dir="rtl">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <Logo size={32} />
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button onClick={() => onEnter(true)} className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2">
                <Send size={16} /> ابدأ الآن
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-bold mb-6">
          ادرس بذكاء، <br />
          <span className="text-brand">وتفوّق بمساعدة AI</span>
        </motion.h1>
        <p className="text-lg text-content-muted max-w-2xl mx-auto mb-10">
          كوتش AI يساعدك على رفع ملفاتك، توليد اختبارات ذكية، محاكاة الامتحانات، وتتبع تقدمك — كل ذلك في منصة واحدة أنيقة.
        </p>
        <button onClick={() => onEnter(true)} className="bg-brand hover:bg-brand-hover text-white px-8 py-3 rounded-xl font-bold text-lg transition-colors">
          ابدأ مجاناً الآن
        </button>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16 border-t border-border">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">كل ما تحتاجه في مكان واحد</h2>
          <p className="text-content-muted">أدوات ذكية صمّمناها بعناية لترفع مستواك الدراسي.</p>
        </div>
        <StaggerContainer className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <StaggerItem key={i} className="bg-surface-card border border-border rounded-2xl p-6 hover:shadow-brand transition-all">
              <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-content-muted leading-relaxed">{f.desc}</p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>
    </div>
  );
}