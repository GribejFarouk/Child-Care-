import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function AnimatedMetric({ value, suffix = '', duration = 1.5 }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest * 10) / 10);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: "easeOut" });
    return controls.stop;
  }, [value, duration, count]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (latest) => {
      setDisplayValue(latest);
    });

    return unsubscribe;
  }, [rounded]);

  return (
    <motion.span className="font-bold text-primary-900">
      {displayValue}{suffix}
    </motion.span>
  );
}
