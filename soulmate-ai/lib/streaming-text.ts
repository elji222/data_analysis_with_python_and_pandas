export function getVisibleStreamingText(
  streamingText: string | null,
  smoothStreamingText: string
): string {
  const live = streamingText ?? '';
  return live.length > smoothStreamingText.length ? live : smoothStreamingText;
}
