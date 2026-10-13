import React from 'react';
import { motion } from 'framer-motion';

export default function Reveal({
  children,
  delay = 0,
  direction = 'up',
  distance = 24,
  duration = 0.5,
  className = '',
  as = 'div',
}) {
  const y = direction === 'up' ? distance : direction === 'down' ? -distance : 0;
  const x = direction === 'left' ? distance : direction === 'right' ? -distance : 0;

  const Comp = motion[as] || motion.div;

  return (
    <Comp
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={className}
    >
      {children}
    </Comp>
  );
}