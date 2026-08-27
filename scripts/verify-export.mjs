/**
 * `beforeBuildCommand` for `tauri build` — verifies the export, does not create it.
 *
 * ## Why the export is not built here
 *
 * This used to be `npm run build:native`, and running the Next build inside
 * Tauri's `beforeBuildCommand` cost two things:
 *
 * 1. **Memory.** Tauri holds the command open as its child, so V8's heap — up to
 *    6 GB, see build-native.mjs — is still committed when cargo and rustc start.
 *    On a 16 GB machine the OS then kills something mid-build. The observed
 *    failure was the whole process tree dying during "Collecting page data", which
 *    took the `finally` that restores `src/app` with it and left 20 routes sitting
 *    in `.native-stash/`.
 *
 * 2. **The error message.** Tauri reads the child through a pipe and stops at the
 *    exit code, and Node's `process.exit()` discards buffered writes to a pipe. The
 *    reason for a failure was reliably destroyed — three separate diagnoses were
 *    attempted against `beforeBuildCommand failed with exit code 1` and nothing
 *    else.
 *
 * So `npm run tauri:build` now runs the export as its own process, which fully
 * exits — releasing every byte — before the Rust build begins.
 *
 * ## Why this file still exists
 *
 * Removing `beforeBuildCommand` outright would mean a bare `tauri build`, run by
 * hand or by a CI step that skipped the npm script, silently bundles whatever
 * `out/` happens to hold. A desktop installer shipped from a week-old export is a
 * far worse outcome than a failed build, and it is invisible: the app installs and
 * runs, just without the change you are testing. This check is milliseconds and
 * turns that into an error that says what to do.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'out');
const ENTRY = join(OUT, 'index.html');

/** Files whose edit invalidates the export. Directories are walked. */
const SOURCES = [
  'src',
  'next.config.ts',
  'tailwind.config.ts',
  'postcss.config.mjs',
  'package.json',
];

/** Never walked: build output, dependencies, and the native build's own scratch. */
const SKIP_DIRS = new Set(['node_modules', '.next', 'out', '.git', '.native-stash']);

const fail = (message) => {
  console.error(`\n[verify-export] ${message}\n`);
  process.exit(1);
};

if (!existsSync(ENTRY)) {
  fail(
    `No static export found at out/index.html.\n\n` +
      `  tauri build bundles whatever is in out/ — it does not create it.\n` +
      `  Run the export first:\n\n` +
      `    npm run tauri:build      (export, then bundle — what you probably want)\n` +
      `    npm run build:native     (export only)`
  );
}

/**
 * Newest source mtime, and which file it was.
 *
 * Only file mtimes are compared. Directory mtimes change when the native build
 * moves paths in and out of `.native-stash/`, which would report every build as
 * stale immediately after the export that produced it.
 */
function newestSource() {
  let newest = { mtimeMs: 0, path: null };

  const consider = (full, stats) => {
    if (stats.mtimeMs > newest.mtimeMs) {
      newest = { mtimeMs: stats.mtimeMs, path: relative(ROOT, full) };
    }
  };

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(join(dir, entry.name));
      } else if (entry.isFile()) {
        const full = join(dir, entry.name);
        consider(full, statSync(full));
      }
    }
  };

  for (const rel of SOURCES) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) continue;
    const stats = statSync(full);
    if (stats.isDirectory()) walk(full);
    else consider(full, stats);
  }

  return newest;
}

const exportedAt = statSync(ENTRY).mtimeMs;
const newest = newestSource();

if (newest.path && newest.mtimeMs > exportedAt) {
  const minutes = Math.round((newest.mtimeMs - exportedAt) / 60000);
  fail(
    `The export in out/ is older than the source.\n\n` +
      `  out/index.html   ${new Date(exportedAt).toLocaleString()}\n` +
      `  ${newest.path}   ${new Date(newest.mtimeMs).toLocaleString()}  (newer by ~${minutes} min)\n\n` +
      `  Bundling now would ship a stale build that installs and runs correctly\n` +
      `  while missing that change. Re-export first:\n\n` +
      `    npm run build:native`
  );
}

console.log('[verify-export] out/ is present and newer than src/ — bundling that.');
