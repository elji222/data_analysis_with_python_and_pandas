import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';

type ChatIntent = {
  prompt: string;
  newConversation?: boolean;
};

type ChatIntentContextValue = {
  setChatIntent: (intent: ChatIntent) => void;
  consumeChatIntent: () => ChatIntent | null;
};

const ChatIntentContext = createContext<ChatIntentContextValue | null>(null);

export function ChatIntentProvider({ children }: { children: ReactNode }) {
  const intentRef = useRef<ChatIntent | null>(null);

  const setChatIntent = useCallback((intent: ChatIntent) => {
    intentRef.current = intent;
  }, []);

  const consumeChatIntent = useCallback(() => {
    const intent = intentRef.current;
    intentRef.current = null;
    return intent;
  }, []);

  const value = useMemo(
    () => ({
      setChatIntent,
      consumeChatIntent,
    }),
    [consumeChatIntent, setChatIntent]
  );

  return <ChatIntentContext.Provider value={value}>{children}</ChatIntentContext.Provider>;
}

export function useChatIntent() {
  const context = useContext(ChatIntentContext);
  if (!context) {
    throw new Error('useChatIntent must be used within ChatIntentProvider');
  }

  return context;
}
