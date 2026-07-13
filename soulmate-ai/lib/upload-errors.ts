function isNetworkFetchFailure(message: string): boolean {
  return /failed to fetch/i.test(message) || /networkerror/i.test(message) || /load failed/i.test(message);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
}

export function formatUploadError(error: unknown): string {
  const message = errorMessage(error);
  if (isNetworkFetchFailure(message)) {
    return 'Upload failed — the photo may be too large or the connection dropped. Try a smaller image or check your internet.';
  }
  if (/too large/i.test(message)) return message;
  return message || 'Could not attach photo';
}

export function formatChatError(error: unknown): string {
  const message = errorMessage(error);
  if (isNetworkFetchFailure(message)) {
    return 'Message failed to send — the photo may be too large or the connection dropped. Try a smaller image or check your internet.';
  }
  return message || 'Something went wrong. Please try again.';
}
