export function getVisibleStreamingText(
  streamingText: string | null,
  smoothStreamingText: string
): string {
  if (streamingText) {
    return streamingText;
  }

  return smoothStreamingText;
}
