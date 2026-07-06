import { useEffect, useRef, useState } from 'react';

const MIN_CHARS_PER_FRAME = 1;
const MAX_CHARS_PER_FRAME = 2;
const MAX_CATCHUP_CHARS_PER_FRAME = 10;
const CATCH_UP_DIVISOR = 10;
const LETTER_BY_LETTER_BEHIND_CHARS = 4;
const FAST_CATCH_UP_BEHIND_CHARS = 36;
const BASE_FRAME_INTERVAL_MS = 1000 / 60;
const SLOWDOWN_FACTOR = 1.15;

function getFrameIntervalMs(behind: number) {
  if (behind > FAST_CATCH_UP_BEHIND_CHARS) {
    return BASE_FRAME_INTERVAL_MS;
  }

  return BASE_FRAME_INTERVAL_MS * SLOWDOWN_FACTOR;
}

function getStepSize(behind: number) {
  if (behind <= LETTER_BY_LETTER_BEHIND_CHARS) {
    return MIN_CHARS_PER_FRAME;
  }

  const maxStep =
    behind > FAST_CATCH_UP_BEHIND_CHARS ? MAX_CATCHUP_CHARS_PER_FRAME : MAX_CHARS_PER_FRAME;

  return Math.max(MIN_CHARS_PER_FRAME, Math.min(maxStep, Math.ceil(behind / CATCH_UP_DIVISOR)));
}

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
        const frameIntervalMs = getFrameIntervalMs(behind);
        const isFirstReveal = indexRef.current === 0;
        const elapsed =
          lastStepAtRef.current === 0
            ? isFirstReveal
              ? 0
              : frameIntervalMs
            : timestamp - lastStepAtRef.current;

        if (isFirstReveal || elapsed >= frameIntervalMs) {
          const stepSize = getStepSize(behind);
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
