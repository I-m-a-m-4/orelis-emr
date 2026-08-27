'use client';

/**
 * Platform detection for the Tauri shells.
 *
 * Orelis runs in four places: a browser (and its PWA), a Windows/macOS desktop
 * shell, and Android/iOS. Almost none of the app needs to know the difference —
 * these helpers exist so the handful of decisions that *do* differ (where an
 * `/api` fetch resolves, where updates come from, how a link leaves the app)
 * live in exactly one place rather than as scattered
 * `window.__TAURI_INTERNALS__` checks.
 */

/** Running inside a Tauri shell (desktop or mobile) rather than a browser. */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

/** Running inside the Android or iOS build specifically — not desktop, not web. */
export function isMobileApp(): boolean {
  if (!isNativeApp()) return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Running inside the Windows/macOS/Linux desktop build specifically. */
export function isDesktopApp(): boolean {
  return isNativeApp() && !isMobileApp();
}

/**
 * Origin to prefix an `/api/...` fetch with.
 *
 * Native builds are a static export with no local server, so a relative fetch
 * resolves against `tauri://localhost` and 404s — they must call the hosted
 * deployment by absolute URL. The web app must NOT: hardcoding
 * `https://orelis.app` there sends every local `npm run dev` request to
 * production, so a route you just added locally still 404s and a clinic you are
 * trying to test writes against the live database. Same-origin on web is what
 * makes local testing possible at all.
 *
 * The `|| 'https://orelis.app'` fallback matters because `.env` is gitignored:
 * if `NEXT_PUBLIC_BASE_URL` is missing from a CI `env:` block it inlines as
 * `undefined` in the nested Tauri rebuild and every call would hit
 * `undefined/api/...`.
 */
export function apiBase(): string {
  if (!isNativeApp()) return '';
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://orelis.app';
  return base.replace(/\/+$/, '');
}

/**
 * Where a signed-out visitor should land.
 *
 * The marketing site is not bundled into the native builds (see
 * `scripts/tauri-prebuild.mjs`), so `/` has nothing to show there — a native
 * launch goes straight to the login screen, which carries its own branding.
 */
export function signedOutLandingRoute(): string {
  return isNativeApp() ? '/login' : '/';
}

/** Where this install gets its updates from. */
export type UpdateChannel = 'play' | 'microsoft' | 'apple' | 'tauri' | 'web';

/**
 * Must match `identifier` in `src-tauri/tauri.conf.json`.
 *
 * Not `com.orelis.app`: Tauri warns that an identifier ending in `.app` collides
 * with the macOS bundle extension (`Orelis.app`), and this is the last moment it
 * is free to change — an identifier is the primary key of a Play Store and
 * Microsoft Store listing and cannot be edited after the first publish.
 */
const APP_IDENTIFIER = 'com.orelis.emr';

/**
 * Store listing IDs.
 *
 * These are placeholders until the listings are created — `storeUrl()` returns
 * null for an unset ID rather than linking somewhere broken, and callers already
 * handle null by hiding their "update" affordance. Set them via env so a build
 * can point at a draft listing without a code change.
 */
const MS_STORE_ID = process.env.NEXT_PUBLIC_MS_STORE_ID || '';
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${APP_IDENTIFIER}`;
const APPLE_STORE_URL = process.env.NEXT_PUBLIC_APPLE_STORE_URL || '';
const MS_STORE_URL = MS_STORE_ID
  ? `https://apps.microsoft.com/detail/${MS_STORE_ID}`
  : '';
/** Deep links that open the Store app directly rather than the browser. */
const MS_STORE_PROTOCOL = MS_STORE_ID
  ? `ms-windows-store://pdp/?ProductId=${MS_STORE_ID}`
  : '';
const PLAY_STORE_PROTOCOL = `market://details?id=${APP_IDENTIFIER}`;

export function updateChannel(): UpdateChannel {
  if (!isNativeApp()) return 'web';
  if (isMobileApp()) {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'apple' : 'play';
  }
  // Desktop. The NSIS build carries the Tauri updater and patches itself, so
  // only the Store build needs to send the user somewhere. We cannot detect the
  // Store package from the webview, so treat Windows as Store-managed once a
  // listing exists and let the in-app updater handle the sideloaded case.
  if (navigator.userAgent.includes('Windows') && MS_STORE_ID) return 'microsoft';
  return 'tauri';
}

/** Store listing for this install, or null when there is nowhere to send them. */
export function storeUrl(channel: UpdateChannel = updateChannel()): string | null {
  switch (channel) {
    case 'play':
      return PLAY_STORE_URL;
    case 'microsoft':
      return MS_STORE_URL || null;
    case 'apple':
      return APPLE_STORE_URL || null;
    default:
      return null;
  }
}

/** Human label for the update destination, e.g. "Microsoft Store". */
export function storeName(channel: UpdateChannel = updateChannel()): string {
  switch (channel) {
    case 'play':
      return 'Google Play';
    case 'microsoft':
      return 'Microsoft Store';
    case 'apple':
      return 'App Store';
    default:
      return 'Orelis';
  }
}

/**
 * The native-app deep link for one of our store listings, or null for any other
 * URL. Matching on the https listing means callers only have to carry one URL.
 */
function storeProtocol(url: string): string | null {
  if (MS_STORE_PROTOCOL && /apps\.microsoft\.com/i.test(url)) return MS_STORE_PROTOCOL;
  if (/play\.google\.com/i.test(url)) return PLAY_STORE_PROTOCOL;
  return null;
}

/**
 * Opens a URL outside the app.
 *
 * `window.open` is a no-op in the Tauri webview, so anything that has to leave
 * the app — a store listing, a help article, a lab's result portal — goes
 * through the shell plugin when we are running natively. Store URLs try their
 * deep link first so the Store/Play app opens instead of a browser tab;
 * `shell:default` only scopes http(s), so the non-http attempt rejects
 * harmlessly and we fall back to the web listing rather than navigating the
 * shell somewhere it cannot return from.
 */
export async function openExternal(url: string): Promise<void> {
  if (!url) return;

  if (isNativeApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const deepLink = storeProtocol(url);
      if (deepLink) {
        try {
          await invoke('plugin:shell|open', { path: deepLink });
          return;
        } catch {
          // scope rejects non-http schemes — use the web listing below
        }
      }
      await invoke('plugin:shell|open', { path: url });
      return;
    } catch {
      // plugin unavailable — let the webview try
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Opens the store listing. On Windows the ms-windows-store: protocol opens the
 * Store app directly; the https URL is the fallback when that is unavailable.
 */
export function openStore(channel: UpdateChannel = updateChannel()): void {
  const url = storeUrl(channel);
  if (url) void openExternal(url);
}

/**
 * Semver compare limited to the numeric major.minor.patch prefix.
 * Returns true when `latest` is strictly newer than `current`.
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) =>
    String(v ?? '')
      .trim()
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const a = parse(latest);
  const b = parse(current);
  for (let i = 0; i < Math.max(a.length, b.length, 3); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}
