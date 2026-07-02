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
  const finalizedTranscriptRef = useRef('');
  const shouldRestartRef = useRef(false);

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

  const stopRecognition = useCallback(() => {
    shouldRestartRef.current = false;

    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
    } catch {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors when recognition already ended.
      }
    }

    recognitionRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    isRecordingRef.current = false;
    stopRecognition();
    stopAudioMonitor();
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

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;
    source.connect(analyser);
    analyserRef.current = analyser;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const updateLevels = () => {
      if (!analyserRef.current || !isRecordingRef.current) return;

      analyserRef.current.getByteFrequencyData(frequencyData);
      const step = Math.max(1, Math.floor(frequencyData.length / VOICE_WAVEFORM_BAR_COUNT));
      const nextLevels = Array.from({ length: VOICE_WAVEFORM_BAR_COUNT }, (_, index) => {
        const value = frequencyData[index * step] / 255;
        return Math.max(0.12, Math.min(1, value * 1.35));
      });

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

        const combined = `${finalizedTranscriptRef.current}${interimTranscript}`.trim();
        setTranscript(combined);
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
    []
  );

  const startRecording = useCallback(async () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition || isRecordingRef.current) {
      return false;
    }

    finalizedTranscriptRef.current = '';
    setTranscript('');
    setAudioLevels(createIdleLevels());
    isRecordingRef.current = true;
    shouldRestartRef.current = true;
    setIsRecording(true);

    try {
      await startAudioMonitor();
    } catch {
      teardown();
      return false;
    }

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
  }, [bindRecognitionHandlers, startAudioMonitor, teardown]);

  const cancelRecording = useCallback(() => {
    finalizedTranscriptRef.current = '';
    setTranscript('');
    teardown();
  }, [teardown]);

  const confirmRecording = useCallback(() => {
    const finalText = transcript.trim();
    finalizedTranscriptRef.current = '';
    setTranscript('');
    teardown();
    return finalText;
  }, [teardown, transcript]);

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
