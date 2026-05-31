import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function AnimatedMetric({ value, suffix = '', duration = 1.5, emptyLabel = '—' }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest * 10) / 10);
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = Number(value);
  const hasValue = value !== null && value !== undefined && value !== '' && !Number.isNaN(numericValue);

  useEffect(() => {
    if (!hasValue) return undefined;
    const controls = animate(count, numericValue, { duration, ease: "easeOut" });
    return controls.stop;
  }, [numericValue, duration, count, hasValue]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (latest) => {
      setDisplayValue(latest);
    });

    return unsubscribe;
  }, [rounded]);

  return (
    <motion.span className="font-bold text-primary-900">
      {hasValue ? displayValue : emptyLabel}{hasValue ? suffix : ''}
    </motion.span>
  );
}
