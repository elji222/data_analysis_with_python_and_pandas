import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export const VOICE_WAVEFORM_BAR_COUNT = 48;

type SpeechRecognitionAlternative = {
  transcript?: string;
};

type SpeechRecognitionResultItem = {
  0?: SpeechRecognitionAlternative;
  isFinal?: boolean;
  length: number;
};

type SpeechRecognitionResultList = ArrayLike<SpeechRecognitionResultItem> & {
  length: number;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function createIdleLevels(): number[] {
  return Array.from({ length: VOICE_WAVEFORM_BAR_COUNT }, () => 0.12);
}

function getCurrentTranscript(
  finalizedTranscript: string,
  interimTranscript: string,
  transcriptSnapshot: string
): string {
  return (
    transcriptSnapshot.trim() ||
    `${finalizedTranscript} ${interimTranscript}`.trim().replace(/\s+/g, ' ')
  );
}

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevels, setAudioLevels] = useState<number[]>(createIdleLevels);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const isConfirmingRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const finalizedTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const transcriptRef = useRef('');

  const updateTranscript = useCallback((nextTranscript: string) => {
    transcriptRef.current = nextTranscript;
    setTranscript(nextTranscript);
  }, []);

  const stopAudioMonitor = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevels(createIdleLevels());
  }, []);

  const stopRecognition = useCallback((mode: 'abort' | 'stop' = 'abort') => {
    shouldRestartRef.current = false;

    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;

    try {
      recognition.onend = null;
      if (mode === 'stop') {
        recognition.stop();
      } else {
        recognition.abort();
      }
    } catch {
      try {
        recognition.abort();
      } catch {
        // Ignore stop errors when recognition already ended.
      }
    }
  }, []);

  const teardown = useCallback(() => {
    isRecordingRef.current = false;
    isConfirmingRef.current = false;
    stopRecognition('abort');
    stopAudioMonitor();
    recognitionRef.current = null;
    setIsRecording(false);
  }, [stopAudioMonitor, stopRecognition]);

  useEffect(() => {
    setIsSupported(getSpeechRecognitionConstructor() !== null);

    return () => {
      teardown();
    };
  }, [teardown]);

  const startAudioMonitor = useCallback(async () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    mediaStreamRef.current = stream;

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    await audioContext.resume();

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.35;
    source.connect(analyser);
    analyserRef.current = analyser;

    const timeData = new Uint8Array(analyser.fftSize);
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const previousLevelsRef = { current: createIdleLevels() };

    const updateLevels = () => {
      if (!analyserRef.current || !isRecordingRef.current) return;

      analyserRef.current.getByteTimeDomainData(timeData);
      analyserRef.current.getByteFrequencyData(frequencyData);

      const nextLevels = Array.from({ length: VOICE_WAVEFORM_BAR_COUNT }, (_, index) => {
        const timeStart = Math.floor((index / VOICE_WAVEFORM_BAR_COUNT) * timeData.length);
        const timeEnd = Math.floor(((index + 1) / VOICE_WAVEFORM_BAR_COUNT) * timeData.length);

        let peak = 0;
        for (let sampleIndex = timeStart; sampleIndex < timeEnd; sampleIndex += 1) {
          const amplitude = Math.abs(timeData[sampleIndex] - 128) / 128;
          peak = Math.max(peak, amplitude);
        }

        const frequencyValue =
          frequencyData[Math.floor((index / VOICE_WAVEFORM_BAR_COUNT) * frequencyData.length)] / 255;

        const centerBoost = 1 + 0.35 * (1 - Math.abs(index - VOICE_WAVEFORM_BAR_COUNT / 2) / (VOICE_WAVEFORM_BAR_COUNT / 2));
        const rawLevel = Math.max(peak * 2.4, frequencyValue * 1.1) * centerBoost;
        const smoothed = previousLevelsRef.current[index] * 0.55 + rawLevel * 0.45;

        return Math.max(0.1, Math.min(1, smoothed));
      });

      previousLevelsRef.current = nextLevels;
      setAudioLevels(nextLevels);
      animationFrameRef.current = requestAnimationFrame(updateLevels);
    };

    animationFrameRef.current = requestAnimationFrame(updateLevels);
  }, []);

  const bindRecognitionHandlers = useCallback(
    (recognition: SpeechRecognitionInstance) => {
      recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const chunk = result[0]?.transcript ?? '';

          if (result.isFinal) {
            finalizedTranscriptRef.current = `${finalizedTranscriptRef.current} ${chunk}`.trim();
          } else {
            interimTranscript += chunk;
          }
        }

        interimTranscriptRef.current = interimTranscript.trim();
        const combined = `${finalizedTranscriptRef.current} ${interimTranscriptRef.current}`
          .trim()
          .replace(/\s+/g, ' ');

        updateTranscript(combined);
      };

      recognition.onerror = (event) => {
        if (event.error === 'aborted' || isConfirmingRef.current) {
          return;
        }

        if (isRecordingRef.current) {
          shouldRestartRef.current = true;
        }
      };

      recognition.onend = () => {
        if (isConfirmingRef.current) {
          recognitionRef.current = null;
          return;
        }

        if (!isRecordingRef.current || !shouldRestartRef.current) {
          recognitionRef.current = null;
          return;
        }

        try {
          recognition.start();
        } catch {
          recognitionRef.current = null;
        }
      };
    },
    [updateTranscript]
  );

  const startRecording = useCallback(async () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition || isRecordingRef.current) {
      return false;
    }

    finalizedTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    setAudioLevels(createIdleLevels());
    isRecordingRef.current = true;
    isConfirmingRef.current = false;
    shouldRestartRef.current = true;
    setIsRecording(true);

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = navigator.language || 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      bindRecognitionHandlers(recognition);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      teardown();
      return false;
    }

    try {
      await startAudioMonitor();
    } catch {
      // Waveform may be unavailable if the mic is busy, but speech can still work.
    }

    return true;
  }, [bindRecognitionHandlers, startAudioMonitor, teardown]);

  const cancelRecording = useCallback(() => {
    finalizedTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    teardown();
  }, [teardown]);

  const confirmRecording = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      isConfirmingRef.current = true;
      shouldRestartRef.current = false;

      const finish = () => {
        const finalText = getCurrentTranscript(
          finalizedTranscriptRef.current,
          interimTranscriptRef.current,
          transcriptRef.current
        );

        finalizedTranscriptRef.current = '';
        interimTranscriptRef.current = '';
        transcriptRef.current = '';
        setTranscript('');
        isRecordingRef.current = false;
        isConfirmingRef.current = false;
        stopAudioMonitor();
        setIsRecording(false);
        recognitionRef.current = null;
        resolve(finalText);
      };

      const recognition = recognitionRef.current;
      if (!recognition) {
        finish();
        return;
      }

      const timeoutId = window.setTimeout(finish, 900);

      recognition.onend = () => {
        window.clearTimeout(timeoutId);
        finish();
      };

      try {
        recognition.stop();
      } catch {
        window.clearTimeout(timeoutId);
        finish();
      }
    });
  }, [stopAudioMonitor]);

  return {
    isRecording,
    isSupported,
    transcript,
    audioLevels,
    startRecording,
    cancelRecording,
    confirmRecording,
  };
}
