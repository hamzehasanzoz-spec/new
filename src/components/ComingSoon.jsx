import React from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo';

export default function ComingSoon({ name }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 text-center" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
        <div className="flex justify-center mb-8"><Logo size={80} showText={false} /></div>
        <h1 className="text-3xl font-bold text-content mb-4">تم حجز مقعدك بنجاح يا {name.split(' ')[0]}! 🎉</h1>
        <p className="text-content-muted text-sm leading-relaxed mb-8">
          أنت الآن ضمن أول 1000 طالب في النسخة التجريبية من كوتش AI. 
          نعمل حالياً على تجهيز المنصة بأفضل شكل ممكن. 
          سنرسل لك دعوة على بريدك الإلكتروني فور الإطلاق الرسمي!
        </p>
        
        <div className="bg-surface-card border border-border p-6 rounded-lg">
          <div className="text-2xl mb-2">⏳</div>
          <div className="font-bold text-primary">Coming Soon</div>
          <div className="text-xs text-content-subtle mt-1">نراكم قريباً جداً</div>
        </div>
      </motion.div>
    </div>
  );
}