export function formatCurrentDate(now = new Date(), timeZone = 'UTC') {
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  });
}

export function appendCurrentDateContext(
  systemPrompt: string,
  now = new Date(),
  timeZone = 'UTC'
) {
  const today = formatCurrentDate(now, timeZone);

  return `${systemPrompt}\n\nToday's date is ${today}. If the user asks for today's date, the current day, or what day it is, answer using this date.`;
}
