import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';

export default function AnimatedMetric({ value, suffix = '', duration = 1.5 }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest * 10) / 10);

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: "easeOut" });
    return controls.stop;
  }, [value, duration, count]);

  return (
    <motion.span className="font-bold text-primary-900">
      {rounded}{suffix}
    </motion.span>
  );
}
