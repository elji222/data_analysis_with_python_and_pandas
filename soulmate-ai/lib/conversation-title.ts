const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'am',
  'as',
  'at',
  'be',
  'been',
  'being',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'for',
  'from',
  'had',
  'has',
  'have',
  'he',
  'her',
  'him',
  'his',
  'how',
  'i',
  'if',
  'in',
  'is',
  'it',
  'just',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'please',
  'she',
  'so',
  'that',
  'the',
  'their',
  'them',
  'they',
  'this',
  'to',
  'too',
  'up',
  'us',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'will',
  'with',
  'would',
  'you',
  'your',
  'want',
  'need',
  'help',
  'talk',
  'about',
  'tell',
  'ask',
  'something',
  'anything',
  'really',
  'like',
  'know',
  'think',
  'feel',
  'feeling',
]);

function capitalizeWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function createConversationTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim().replace(/[^\w\s'-]/g, ' ');
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return 'New chat';
  }

  const meaningful = words.filter(
    (word) => word.length > 1 && !STOP_WORDS.has(word.toLowerCase())
  );
  const source = meaningful.length > 0 ? meaningful : words.slice(0, 3);
  const titleWords = source.slice(0, 3).map(capitalizeWord);

  return titleWords.join(' ');
}

export function isDefaultConversationTitle(title: string): boolean {
  return title === 'New chat' || title === 'New conversation';
}

export function shouldShortenConversationTitle(title: string, firstMessage?: string): boolean {
  if (isDefaultConversationTitle(title)) return true;

  const trimmedTitle = title.trim();
  const trimmedMessage = firstMessage?.trim();

  if (trimmedMessage && trimmedTitle === trimmedMessage) return true;
  if (trimmedTitle.length > 28) return true;
  if (trimmedTitle.split(/\s+/).length > 4) return true;

  return false;
}

export function normalizeConversationTitle(title: string): string {
  const trimmed = title.trim().replace(/^["']|["']$/g, '').replace(/[.!?]+$/g, '');
  const words = trimmed.split(/\s+/).filter(Boolean).slice(0, 3);
  return words.map(capitalizeWord).join(' ') || 'New chat';
}
