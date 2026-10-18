import React from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo';

export default function ComingSoon({ name }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 text-center overflow-hidden relative" dir="rtl">
      {/* خلفية نارية متحركة */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-50 animate-pulse delay-1000" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5, type: "spring" }}
        className="max-w-md relative z-10"
      >
        <div className="flex justify-center mb-8">
          <Logo size={80} showText={false} />
        </div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl md:text-4xl font-extrabold text-content mb-4"
        >
          المنصة قيد التجهيز يا {name.split(' ')[0]}! 🔥
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-content-muted text-sm md:text-base leading-relaxed mb-8"
        >
          نحن نعمل بجد الآن لإطلاق النسخة التجريبية بأفضل شكل ممكن. 
          فريقنا يجهز كل التفاصيل لتنطلق تجربتك الدراسية بأقوى مما تتخيل.
          <br /><br />
          <strong className="text-primary font-bold">ترقبوا الإطلاق قريباً جداً! 🚀</strong>
        </motion.p>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-surface-card border border-border p-6 rounded-2xl shadow-lg inline-block w-full"
        >
          <div className="text-4xl mb-2 animate-bounce">⏳</div>
          <div className="font-bold text-lg text-content">قريباً على شاشاتكم</div>
          <div className="text-xs text-content-subtle mt-1">نراكم في النسخة التجريبية</div>
        </motion.div>
      </motion.div>
    </div>
  );
}