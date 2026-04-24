import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  suffix?: string;
}

export const AnimatedCounter = ({
  value,
  duration = 1.2,
  decimals = 0,
  className,
  suffix = "",
}: AnimatedCounterProps) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => v.toFixed(decimals));
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    });
    return controls.stop;
  }, [value, duration, decimals, count]);

  return (
    <motion.span className={className}>
      {display}
      {suffix}
    </motion.span>
  );
};
