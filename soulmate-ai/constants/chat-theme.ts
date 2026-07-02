export const UI_VERSION = '2025-07-14';

export const ChatTheme = {
  pageBg: '#FFFFFF',
  pageBgDark: '#212121',
  sidebarBg: '#F9F9F9',
  sidebarBgDark: '#171717',
  sidebarHover: '#ECECEC',
  sidebarHoverDark: '#2A2A2A',
  sidebarActive: '#E5E5E5',
  sidebarActiveDark: '#343434',
  sidebarBorder: '#E8E8E8',
  sidebarBorderDark: '#2F2F2F',
  sidebarText: '#0D0D0D',
  sidebarTextDark: '#ECECEC',
  sidebarMuted: '#6B6B6B',
  sidebarMutedDark: '#A0A0A0',
  contentMaxWidth: 1100,
  composerMaxWidth: 1100,
  threadRailWidth: 56,
  messageFontSize: 17,
  messageLineHeight: 28,
  threadPaddingX: 12,
  userBubble: '#F4F4F4',
  userBubbleDark: '#303030',
  assistantText: '#0D0D0D',
  assistantTextDark: '#ECECEC',
  inputBg: '#FFFFFF',
  inputBgDark: '#303030',
  inputBorder: '#E3E3E3',
  inputBorderDark: '#4A4A4A',
  inputPlaceholder: '#8E8E93',
  sendButton: '#0D0D0D',
  sendButtonDisabled: '#C9C9C9',
  accent: '#7B61FF',
  muted: '#6E6E80',
  error: '#D64545',
};

export const QUICK_ACTIONS = [
  {
    icon: 'heart-outline' as const,
    label: 'Talk about feelings',
    prompt: 'I want to talk about how I have been feeling lately.',
  },
  {
    icon: 'create-outline' as const,
    label: 'Write or edit',
    prompt: 'Help me write or edit something I am working on.',
  },
  {
    icon: 'bulb-outline' as const,
    label: 'Think something through',
    prompt: 'Help me think through a decision I am facing.',
  },
];

export const SIDEBAR_NAV_ITEMS = [
  { icon: 'search-outline' as const, label: 'Search chats' },
  { icon: 'library-outline' as const, label: 'Library' },
  { icon: 'time-outline' as const, label: 'Scheduled' },
];
