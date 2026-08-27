/**
 * Prepares `src/app` for a Next.js static export, then hands off to `next build`.
 *
 * Run by `npm run build:native` (and therefore by `tauri build`) before the
 * bundler starts. See `scripts/native-build.mjs` for why recovery runs first.
 */

import { restoreAll, moveAside } from './native-build.mjs';

// A previous run may have died between the renames and the restore. Clean that
// up before touching anything, so a failed build never poisons the next one.
restoreAll({ quiet: true });

moveAside();

console.log('[native-build] src/app ready for static export');
