import { useEffect, useRef, useState } from 'react';

const MIN_CHARS_PER_FRAME = 1;
const MAX_CHARS_PER_FRAME = 14;

export function useSmoothStreamingText(targetText: string | null, isActive: boolean) {
  const [displayText, setDisplayText] = useState('');
  const indexRef = useRef(0);
  const targetRef = useRef('');
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    targetRef.current = targetText ?? '';
  }, [targetText]);

  useEffect(() => {
    if (!isActive || targetText === null) {
      indexRef.current = 0;
      targetRef.current = '';
      setDisplayText('');

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      return;
    }

    const step = () => {
      const target = targetRef.current;
      const behind = target.length - indexRef.current;

      if (behind > 0) {
        const stepSize = Math.max(
          MIN_CHARS_PER_FRAME,
          Math.min(MAX_CHARS_PER_FRAME, Math.ceil(behind / 6))
        );
        indexRef.current = Math.min(target.length, indexRef.current + stepSize);
        setDisplayText(target.slice(0, indexRef.current));
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
