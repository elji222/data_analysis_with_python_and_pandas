import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

type SpeechRecognitionResult = {
  results?: ArrayLike<{ 0?: { transcript?: string } }>;
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResult) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
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

export function useVoiceInput(onTranscript: (text: string, isFinal: boolean) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setIsSupported(getSpeechRecognitionConstructor() !== null);

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      onTranscript('', false);
      return false;
    }

    if (recognitionRef.current) {
      stopListening();
      return true;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results ?? [])
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();

      if (!transcript) return;

      const isFinal = Array.from(event.results ?? []).some(
        (_result, index) => (event.results as Array<{ isFinal?: boolean }>)[index]?.isFinal
      );

      onTranscript(transcript, isFinal);
    };

    recognition.onerror = () => {
      stopListening();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    return true;
  }, [onTranscript, stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return true;
    }

    return startListening();
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    toggleListening,
    stopListening,
  };
}
