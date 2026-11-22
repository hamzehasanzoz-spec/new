import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Mascot({ state = 'neutral', size = 100, className = '' }) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // تتبع حركة الماوس للالتفات (Parallax)
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 15; // حركة خفيفة جداً
      const y = (e.clientY / innerHeight - 0.5) * 15;
      setMousePosition({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // محاكاة الرمش (Blinking) كل 4 ثوانٍ
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200); // مدة الرمشة
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  // تحديد الصورة بناءً على الحالة
  const getImage = () => {
    if (isBlinking && state === 'neutral') return '/assets/sleepy.png';
    
    switch (state) {
      case 'thinking': return '/assets/thinking.png';
      case 'happy': return '/assets/happy.png';
      case 'curious': return '/assets/thinking.png'; // يمكنك تغييرها لصورة فضولي
      default: return '/assets/neutral.png';
    }
  };

  return (
    <motion.div
      className={`relative flex items-center justify-center pointer-events-none ${className}`}
      style={{ width: size, height: size, perspective: 1000 }}
      // 1. حركة الطفو المستمرة (Floating)
      animate={{
        y: [0, -6, 0],
        rotateX: mousePosition.y, // الالتفات العمودي
        rotateY: mousePosition.x, // الالتفات الأفقي
      }}
      transition={{
        y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        rotateX: { type: "spring", stiffness: 100, damping: 20 },
        rotateY: { type: "spring", stiffness: 100, damping: 20 },
      }}
    >
      {/* 2. حركة التنفس (Breathing) */}
      <motion.div
        className="w-full h-full relative"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* 3. الانتقال الناعم بين الصور (Crossfade) */}
        <AnimatePresence mode="wait">
          <motion.img
            key={getImage()}
            src={getImage()}
            alt={`Coach Mascot - ${state}`}
            className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}