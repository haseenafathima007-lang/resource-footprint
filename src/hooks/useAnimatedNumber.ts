import { useState, useEffect, useRef } from "react";

/**
 * Animates a number smoothly to a target value using requestAnimationFrame.
 * Strictly completes within 300ms.
 * Completely disables animation when prefers-reduced-motion is requested.
 */
export function useAnimatedNumber(target: number, duration: number = 300): number {
  const [current, setCurrent] = useState(target);
  const targetRef = useRef(target);
  const currentRef = useRef(target);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // If prefers-reduced-motion is active or target is identical, update immediately
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || typeof requestAnimationFrame !== "function" || targetRef.current === target) {
      targetRef.current = target;
      currentRef.current = target;
      setCurrent(target);
      return;
    }

    const startValue = currentRef.current;
    const endValue = target;
    targetRef.current = target;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic curve
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (endValue - startValue) * eased;

      currentRef.current = nextValue;
      setCurrent(nextValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentRef.current = endValue;
        setCurrent(endValue);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [target, duration]);

  return current;
}
