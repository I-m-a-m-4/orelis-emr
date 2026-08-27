/**
 * Returns `src/app` to its committed state after a native build.
 *
 * Always run this — including after a failed build. `npm run build:native`
 * chains it so a non-zero `next build` still triggers it, and the prebuild calls
 * `restoreAll` itself as a second line of defence.
 */

import { restoreAll } from './native-build.mjs';

const { restored, deleted } = restoreAll();

if (!restored && !deleted) {
  console.log('[native-build] nothing to restore — src/app already clean');
}
