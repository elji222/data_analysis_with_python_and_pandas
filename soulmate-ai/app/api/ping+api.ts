// Lets the app open its HTTPS connection before the first chat message,
// so that message doesn't pay for DNS and the TLS handshake.
export function GET() {
  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  });
}
