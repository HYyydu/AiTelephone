/**
 * Public HTTPS origin for Twilio webhooks and the media-stream WebSocket.
 * No trailing slash.
 *
 * In production, set `PUBLIC_URL` to your deployed API, e.g.
 * `https://your-service.up.railway.app` — not a dev ngrok URL unless that tunnel is running.
 *
 * Optional: if `PUBLIC_URL` is unset, `RAILWAY_PUBLIC_DOMAIN` (hostname only, e.g. `x.up.railway.app`) is used.
 */
export function getPublicBaseUrl(): string {
  const explicit = process.env.PUBLIC_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railway) {
    const host = railway
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .trim();
    if (host) return `https://${host}`;
  }

  return "http://localhost:3001";
}

function hostnameOfBaseUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** Log once at startup if production likely misconfigured for Twilio. */
export function warnIfProductionPublicUrlLooksWrong(): void {
  const url = getPublicBaseUrl();
  const onRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_NAME,
  );
  const host = hostnameOfBaseUrl(url);
  const looksDev =
    /ngrok/i.test(url) ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local");

  if (onRailway && looksDev) {
    console.error(
      "❌ CRITICAL: PUBLIC_URL should be your Railway HTTPS URL (e.g. https://YOUR-SERVICE.up.railway.app).",
    );
    console.error(
      "   Twilio uses it for voice + media-stream webhooks. A stale ngrok or localhost URL causes “an application error” on the phone.",
    );
    console.error(`   Current resolved URL: ${url}`);
  }
}
