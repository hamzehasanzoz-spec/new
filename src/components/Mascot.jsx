import React from 'react';
import { motion } from 'framer-motion';

export default function Mascot({ state = 'neutral', size = 100, className = '' }) {
  // ⭐ هنا نضع كل التعبيرات المتاحة. 
  // يمكنك إضافة أي تعبير جديد لاحقاً بمجرد قص صورته ووضع اسمه هنا.
  const images = {
    neutral: '/assets/neutral.png',
    happy: '/assets/happy.png',
    thinking: '/assets/thinking.png',
    explaining: '/assets/explaining.png',
    celebrating: '/assets/celebrating.png',
    reading: '/assets/reading.png',
    sleepy: '/assets/sleepy.png',
    waving: '/assets/waving.png',
    laptop: '/assets/laptop.png',
    studying: '/assets/studying.png',
    thumbsUp: '/assets/thumbsUp.png',
  };

  const imageSrc = images[state] || images.neutral;

  return (
    <motion.div
      className={`relative flex items-center justify-center pointer-events-none ${className}`}
      initial={{ y: 0 }}
      animate={{
        y: [0, -8, 0], // حركة الطفو
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      style={{ width: size, height: size }}
    >
      {/* 
        ملاحظة: إذا لم تقم بقص الصورة بعد، سيظهر المربع فارغاً.
        تأكد من تسمية الصور بأحرف إنجليزية صغيرة كما في الأعلى.
      */}
      <img
        src={imageSrc}
        alt={`Coach Mascot - ${state}`}
        className="w-full h-full object-contain drop-shadow-2xl"
        onError={(e) => {
          // في حال لم توجد الصورة، نخفيها لكي لا يظهر مربع مكسور
          e.target.style.display = 'none'; 
        }}
      />
    </motion.div>
  );
}