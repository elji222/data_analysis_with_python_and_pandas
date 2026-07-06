import { useEffect, useRef, useState } from 'react';

const MIN_CHARS_PER_FRAME = 1;
const MAX_CHARS_PER_FRAME = 14;
const CATCH_UP_DIVISOR = 6;
const SLOWDOWN_FACTOR = 1.5;
const MIN_FRAME_INTERVAL_MS = (1000 / 60) * SLOWDOWN_FACTOR;

export function useSmoothStreamingText(targetText: string | null, isActive: boolean) {
  const [displayText, setDisplayText] = useState('');
  const indexRef = useRef(0);
  const targetRef = useRef('');
  const frameRef = useRef<number | null>(null);
  const lastStepAtRef = useRef(0);

  useEffect(() => {
    targetRef.current = targetText ?? '';
  }, [targetText]);

  useEffect(() => {
    if (!isActive || targetText === null) {
      indexRef.current = 0;
      targetRef.current = '';
      lastStepAtRef.current = 0;
      setDisplayText('');

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      return;
    }

    const step = (timestamp: number) => {
      const target = targetRef.current;
      const behind = target.length - indexRef.current;

      if (behind > 0) {
        const elapsed = lastStepAtRef.current === 0 ? MIN_FRAME_INTERVAL_MS : timestamp - lastStepAtRef.current;

        if (elapsed >= MIN_FRAME_INTERVAL_MS) {
          const stepSize = Math.max(
            MIN_CHARS_PER_FRAME,
            Math.min(MAX_CHARS_PER_FRAME, Math.ceil(behind / CATCH_UP_DIVISOR))
          );
          indexRef.current = Math.min(target.length, indexRef.current + stepSize);
          setDisplayText(target.slice(0, indexRef.current));
          lastStepAtRef.current = timestamp;
        }
      }

      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [isActive, targetText === null]);

  return displayText;
}
