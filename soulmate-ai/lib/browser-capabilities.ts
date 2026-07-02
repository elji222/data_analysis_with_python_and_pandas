import { Platform } from 'react-native';

export function isWebRuntime() {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

export function isIosWebBrowser() {
  if (!isWebRuntime() || typeof navigator === 'undefined') {
    return false;
  }

  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroidWebBrowser() {
  if (!isWebRuntime() || typeof navigator === 'undefined') {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}

export function isMobileWebBrowser() {
  return isIosWebBrowser() || isAndroidWebBrowser();
}

export function isSecureWebContext() {
  if (!isWebRuntime()) {
    return false;
  }

  if (window.isSecureContext) {
    return true;
  }

  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function getSpeechRecognitionConstructor() {
  if (!isWebRuntime()) {
    return null;
  }

  const browserWindow = window as typeof window & {
    SpeechRecognition?: new () => unknown;
    webkitSpeechRecognition?: new () => unknown;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

export function canUseWebVoiceInput() {
  if (!isWebRuntime()) {
    return false;
  }

  if (!getSpeechRecognitionConstructor()) {
    return false;
  }

  if (isIosWebBrowser()) {
    return false;
  }

  if (isMobileWebBrowser() && !isSecureWebContext()) {
    return false;
  }

  return true;
}

export function getWebVoiceUnsupportedReason(): string | null {
  if (!isWebRuntime()) {
    return 'Voice input is available in the web app for now.';
  }

  if (isIosWebBrowser()) {
    return 'Voice input is not available on iPhone, even in Chrome. Please type your message.';
  }

  if (!getSpeechRecognitionConstructor()) {
    return 'Voice input needs Chrome or Edge with speech support. Try on your PC browser.';
  }

  if (isMobileWebBrowser() && !isSecureWebContext()) {
    return 'Voice needs a secure connection on phone Chrome. Use your PC browser for voice, or type your message.';
  }

  return null;
}
