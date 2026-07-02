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
  return Array.from({ length: VOICE_WAVEFORM_BAR_COUNT }, () => 0.14);
}

function createSpeechLevels(energy: number): number[] {
  return Array.from({ length: VOICE_WAVEFORM_BAR_COUNT }, (_, index) => {
    const wave = Math.sin((index / VOICE_WAVEFORM_BAR_COUNT) * Math.PI * 4 + energy * 12);
    const jitter = Math.random() * 0.22;
    return Math.max(0.12, Math.min(1, 0.18 + energy * 0.75 + wave * 0.12 + jitter));
  });
}

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevels, setAudioLevels] = useState<number[]>(createIdleLevels);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const finalizedTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const transcriptRef = useRef('');
  const speechEnergyRef = useRef(0.2);

  const stopWaveformAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    speechEnergyRef.current = 0.2;
    setAudioLevels(createIdleLevels());
  }, []);

  const startWaveformAnimation = useCallback(() => {
    const tick = () => {
      if (!isRecordingRef.current) return;

      speechEnergyRef.current = Math.max(0.16, speechEnergyRef.current * 0.9);
      setAudioLevels(createSpeechLevels(speechEnergyRef.current));
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const updateTranscript = useCallback((nextTranscript: string) => {
    transcriptRef.current = nextTranscript;
    setTranscript(nextTranscript);
  }, []);

  const stopRecognition = useCallback((mode: 'abort' | 'stop' = 'abort') => {
    shouldRestartRef.current = false;

    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.onend = null;
      if (mode === 'stop') {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.abort();
      }
    } catch {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore stop errors when recognition already ended.
      }
    }

    recognitionRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    isRecordingRef.current = false;
    stopRecognition('abort');
    stopWaveformAnimation();
    setIsRecording(false);
  }, [stopRecognition, stopWaveformAnimation]);

  useEffect(() => {
    setIsSupported(getSpeechRecognitionConstructor() !== null);

    return () => {
      teardown();
    };
  }, [teardown]);

  const bindRecognitionHandlers = useCallback(
    (recognition: SpeechRecognitionInstance) => {
      recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const chunk = result[0]?.transcript ?? '';

          if (result.isFinal) {
            finalizedTranscriptRef.current = `${finalizedTranscriptRef.current} ${chunk}`.trim();
            interimTranscriptRef.current = '';
          } else {
            interimTranscript += chunk;
          }
        }

        interimTranscriptRef.current = interimTranscript.trim();
        const combined = `${finalizedTranscriptRef.current} ${interimTranscriptRef.current}`
          .trim()
          .replace(/\s+/g, ' ');

        if (combined) {
          speechEnergyRef.current = Math.min(1, speechEnergyRef.current + 0.35);
        }

        updateTranscript(combined);
      };

      recognition.onspeechstart = () => {
        speechEnergyRef.current = Math.min(1, speechEnergyRef.current + 0.5);
      };

      recognition.onspeechend = () => {
        speechEnergyRef.current = Math.max(0.25, speechEnergyRef.current);
      };

      recognition.onerror = (event) => {
        if (event.error === 'aborted' || event.error === 'no-speech') {
          return;
        }

        if (isRecordingRef.current) {
          shouldRestartRef.current = true;
        }
      };

      recognition.onend = () => {
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
    shouldRestartRef.current = true;
    setIsRecording(true);
    startWaveformAnimation();

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      bindRecognitionHandlers(recognition);
      recognitionRef.current = recognition;
      recognition.start();
      return true;
    } catch {
      teardown();
      return false;
    }
  }, [bindRecognitionHandlers, startWaveformAnimation, teardown]);

  const cancelRecording = useCallback(() => {
    finalizedTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    teardown();
  }, [teardown]);

  const confirmRecording = useCallback(() => {
    stopRecognition('stop');

    const finalText =
      transcriptRef.current.trim() ||
      `${finalizedTranscriptRef.current} ${interimTranscriptRef.current}`.trim().replace(/\s+/g, ' ');

    finalizedTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    isRecordingRef.current = false;
    shouldRestartRef.current = false;
    stopWaveformAnimation();
    setIsRecording(false);
    recognitionRef.current = null;

    return finalText;
  }, [stopRecognition, stopWaveformAnimation]);

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
