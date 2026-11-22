/**
 * Public origin of this app (e.g. https://chat.example.com).
 * Uses APP_URL when set, otherwise derives it from the request — honouring the
 * X-Forwarded-* headers that cPanel/Passenger and other proxies add.
 */
export function getAppOrigin(request: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && !/localhost|127\.0\.0\.1/.test(configured)) {
    return configured.replace(/\/+$/, '');
  }
  const url = new URL(request.url);
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || url.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || request.headers.get('host') || url.host;
  return `${proto}://${host}`;
}
