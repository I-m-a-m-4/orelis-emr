import { playNotificationSound } from '@/lib/sound';

export type NativeNotificationRequest = {
  key: string;      // Unique identifier (usually Firestore document ID)
  title: string;
  body: string;
  url?: string;     // In-app route or URL to navigate when clicked
};

const DEDUPE_WINDOW_MS = 90_000;
const DESKTOP_TAP_WINDOW_MS = 25_000;
const PENDING_TAP_KEY = 'orelis_pending_notification_tap';

const recentlyShown = new Map<string, number>();
let routerPush: ((path: string) => void) | null = null;
let actionListenerStarted = false;
let desktopTapWatcherStarted = false;

/** Check if running inside Tauri native runtime (Windows, macOS, Android, iOS) */
export function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);
}

/** Register the Next.js router instance to enable tap-through navigation */
export function setNativeNotificationRouter(push: (path: string) => void): void {
  routerPush = push;
}

async function navigateTo(url: string): Promise<void> {
  if (!url) return;
  try {
    if (routerPush) {
      routerPush(url);
    } else if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  } catch (err) {
    console.warn('[notifications] Failed to navigate to notification URL:', err);
  }
}

// 1. Mobile (Android/iOS) Tap Handler via Tauri plugin
async function startActionListener(): Promise<void> {
  if (actionListenerStarted || !isTauriEnv()) return;
  actionListenerStarted = true;
  try {
    const { onAction } = await import('@tauri-apps/plugin-notification');
    await onAction((notification: any) => {
      const url = notification?.extra?.url;
      if (typeof url === 'string' && url) void navigateTo(url);
    });
  } catch (err) {
    actionListenerStarted = false;
  }
}

// 2. Desktop (Windows/macOS) Tap Heuristic
// Since Desktop OS toasts focus the app window when clicked:
function startDesktopTapWatcher(): void {
  if (desktopTapWatcherStarted || typeof document === 'undefined') return;
  desktopTapWatcherStarted = true;
  const flush = () => {
    if (document.visibilityState !== 'visible') return;
    const raw = sessionStorage.getItem(PENDING_TAP_KEY);
    sessionStorage.removeItem(PENDING_TAP_KEY);
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { url?: string; at?: number };
      if (pending?.url && pending.at && Date.now() - pending.at <= DESKTOP_TAP_WINDOW_MS) {
        void navigateTo(pending.url);
      }
    } catch {}
  };
  document.addEventListener('visibilitychange', flush);
  window.addEventListener('focus', flush);
}

function claimIdentity(request: NativeNotificationRequest): boolean {
  const now = Date.now();
  // Purge expired keys
  for (const [key, ts] of recentlyShown.entries()) {
    if (now - ts > DEDUPE_WINDOW_MS) recentlyShown.delete(key);
  }
  const prev = recentlyShown.get(request.key);
  if (prev && now - prev < DEDUPE_WINDOW_MS) return false;
  recentlyShown.set(request.key, now);
  return true;
}

// 3. Request OS / Browser Permissions
export async function initNativeNotificationPermissions(): Promise<boolean> {
  if (isTauriEnv()) {
    try {
      const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
      if (await isPermissionGranted()) return true;
      const status = await requestPermission();
      return status === 'granted';
    } catch (err) {
      console.warn('[notifications] Tauri permission check failed:', err);
      return false;
    }
  }

  // Fallback for standard Web browsers / PWA
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      try {
        const res = await Notification.requestPermission();
        return res === 'granted';
      } catch {
        return false;
      }
    }
  }

  return false;
}

// 4. Trigger the OS Notification
export async function triggerNativeNotification(request: NativeNotificationRequest): Promise<void> {
  try {
    if (!request?.title) return;
    if (!claimIdentity(request)) return; // Prevents duplicate popups within 90 seconds

    const granted = await initNativeNotificationPermissions();
    if (!granted) return;

    // Play audible notification chime
    playNotificationSound();

    if (isTauriEnv()) {
      const { sendNotification } = await import('@tauri-apps/plugin-notification');
      void startActionListener();
      startDesktopTapWatcher();

      if (request.url && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        try {
          sessionStorage.setItem(PENDING_TAP_KEY, JSON.stringify({ url: request.url, at: Date.now() }));
        } catch {}
      }

      sendNotification({
        title: request.title,
        body: request.body || '',
        largeBody: request.body || '',
        extra: request.url ? { url: request.url } : {},
      });
      return;
    }

    // Web Notification API fallback
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(request.title, {
        body: request.body || '',
        icon: '/icon.png',
        tag: request.key,
      });

      if (request.url) {
        notif.onclick = () => {
          window.focus();
          void navigateTo(request.url!);
          notif.close();
        };
      }
    }
  } catch (err) {
    console.warn('[notifications] Failed to raise native notification:', err);
  }
}
