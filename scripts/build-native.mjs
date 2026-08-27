/**
 * `npm run build:native` — the whole static-export build in one process.
 *
 * This exists instead of a chain of npm scripts because the restore step has to
 * run whether or not `next build` succeeds, and there is no shell operator that
 * expresses "always run this next" identically in cmd.exe, PowerShell and sh.
 * Chaining with `&&` skips the restore on failure — which is precisely the
 * scenario that left the reference codebase with two dozen routes renamed to
 * `.bak` in a production deploy.
 *
 * The exit code of `next build` is preserved, so CI still fails on a broken
 * build even though we swallowed the exception long enough to clean up.
 */

import { spawn } from 'node:child_process';
import { existsSync, rmSync, readFileSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { restoreAll, moveAside, ROOT } from './native-build.mjs';

/** Everything `next build` printed, kept for after the pipes are gone. */
const LOG_FILE = join(ROOT, '.native-build.log');

/**
 * Run `next build`, mirroring its output to the terminal *and* to a log file.
 *
 * ## Why the CLI is invoked through node directly
 *
 * This was `spawn('npx', ['next','build'], { shell: true })`, and on Windows that
 * inserts two processes between us and the compiler: `cmd.exe`, then the `npx`
 * shim. The exit code came back through both, and it came back *wrong* — a build
 * that printed `✓ Exporting (3/3)` and a complete route table, and which exits 0
 * when run directly, was reported to the `close` handler as 1. The script then
 * dutifully announced a failure for a build that had succeeded, and `tauri build`
 * refused to bundle it.
 *
 * Spawning `node node_modules/next/dist/bin/next` is the same program with the
 * shims removed: one child, no shell parsing of the path (which matters here —
 * the repo lives under `C:\Users\Bello Imam\`, and a space in a path is exactly
 * what `shell: true` mis-splits), and an exit code that is the compiler's own.
 *
 * ## Why the output is teed to a file
 *
 * Under `tauri build` the child is read through a pipe that closes when the direct
 * child exits, and the reason for a failure was reliably destroyed — three
 * separate diagnoses were attempted against `beforeBuildCommand failed with exit
 * code 1` and nothing else. Writing to a file we own means the reason survives
 * whatever the parent does with the pipe.
 */
function runNextBuild(env) {
  return new Promise((resolve) => {
    const log = createWriteStream(LOG_FILE);
    const nextBin = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
    const child = spawn(process.execPath, [nextBin, 'build'], {
      cwd: ROOT,
      stdio: ['inherit', 'pipe', 'pipe'],
      env,
    });

    const tee = (stream, out) => {
      stream.on('data', (chunk) => {
        out.write(chunk);
        log.write(chunk);
      });
    };
    tee(child.stdout, process.stdout);
    tee(child.stderr, process.stderr);

    child.on('error', (error) => {
      log.end();
      resolve({ error });
    });
    child.on('close', (status, signal) => {
      log.end();
      resolve({ status, signal });
    });
  });
}

/**
 * Delete Next's generated route types before building.
 *
 * `.next/types/app/**` holds one `.ts` shim per route, each importing the page
 * module by relative path to check its exports. Next writes these at the start of
 * a build but never prunes shims for routes that no longer exist — and
 * `tsconfig.json` type-checks them (`**\/*.ts` matches them even without the
 * explicit `.next/types/**` include).
 *
 * So a native build run after a web build inherits ~60 shims for the routes the
 * stash just moved, every one of them a `TS2307: Cannot find module
 * '../../../src/app/super-admin/blog/page.js'`. The build fails at "Checking
 * validity of types" against files it did not compile and does not ship. Verified
 * directly: with the stash staged, `tsc --noEmit` reported 62 errors, all of them
 * in `.next/types/app/**` and none in the stashed source; deleting the directory
 * took it to zero.
 *
 * Deleting costs nothing — Next regenerates it — and `.next/cache` is left alone,
 * so incremental compiles stay fast.
 */
function pruneStaleRouteTypes() {
  const typesDir = join(ROOT, '.next', 'types');
  if (!existsSync(typesDir)) return;
  rmSync(typesDir, { recursive: true, force: true });
  console.log('[native-build] pruned .next/types (stale route shims from the web build)');
}

restoreAll({ quiet: true });

let exitCode = 0;

try {
  moveAside();
  pruneStaleRouteTypes();

  console.log('[native-build] running next build (static export)...');
  const result = await runNextBuild({
    ...process.env,
    // Tells next.config.ts to switch to `output: 'export'`. Set explicitly
    // rather than relying on TAURI_PLATFORM so this script works when invoked
    // directly, not only from the Tauri CLI.
    IS_TAURI: 'true',
    /**
     * The default V8 heap is not enough to compile and type-check this app, and
     * the failure mode is silent: the process is killed mid-compile with no
     * message, which reads exactly like a mysterious build error. Set here
     * rather than in an npm script so `tauri build` — which calls this file via
     * `beforeBuildCommand` and never sees the npm environment — gets it too.
     *
     * Respects an existing NODE_OPTIONS so a caller can raise it further.
     */
    NODE_OPTIONS: process.env.NODE_OPTIONS?.includes('max-old-space-size')
      ? process.env.NODE_OPTIONS
      : `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=6144`.trim(),
  });

  /**
   * Distinguish "compile failed" from "process was killed".
   *
   * A killed child reports a null exit code with `signal` set. The original
   * `result.status ?? 1` flattened that to a plain exit 1, so an out-of-memory
   * kill was indistinguishable from a type error — except that the OOM printed
   * nothing at all, which sent the investigation looking for a compile error that
   * did not exist.
   */
  if (result.error) {
    console.error('[native-build] could not start next build:', result.error.message);
    exitCode = 1;
  } else if (result.status === null) {
    console.error(
      `[native-build] next build was killed (signal ${result.signal ?? 'unknown'}).\n` +
        '[native-build] This is almost always the OS reclaiming memory. Close other\n' +
        '[native-build] applications, or raise NODE_OPTIONS=--max-old-space-size.'
    );
    exitCode = 1;
  } else {
    exitCode = result.status;
    if (exitCode !== 0) {
      // Report the raw values. A wrong exit code masquerading as a compile failure
      // cost three diagnoses; naming what was actually received makes the next
      // instance of that obvious instead of invisible.
      console.error(
        `[native-build] next build exited ${result.status} (signal ${result.signal ?? 'none'})`
      );
    }
  }
} catch (err) {
  console.error('[native-build] build threw:', err instanceof Error ? err.message : err);
  exitCode = 1;
} finally {
  // Unconditional. This is the whole reason the script exists.
  restoreAll();
}

if (exitCode === 0) {
  console.log('[native-build] static export complete → out/');
} else {
  /**
   * Re-print the end of the build log.
   *
   * When this runs under `tauri build` the child's output may never have reached
   * the Tauri log at all. Echoing it here, from the process Tauri is actually
   * reading, is what turns "failed with exit code 1" into something diagnosable.
   */
  if (existsSync(LOG_FILE)) {
    const tail = readFileSync(LOG_FILE, 'utf8').split('\n').slice(-40).join('\n');
    console.error(`\n[native-build] last 40 lines of ${LOG_FILE}:\n${tail}`);
  }
  console.error(`[native-build] build failed (exit ${exitCode}) — src/app restored`);
}

/**
 * Set the code rather than calling `process.exit()`.
 *
 * `process.exit()` does not flush pending writes to stdout when stdout is a pipe —
 * which it is whenever this runs under another tool or with its output redirected.
 * The failure message below was being written and then discarded, so a broken
 * build reported nothing but its exit code. Assigning `exitCode` lets Node exit
 * once the streams have drained, which is the whole difference between a
 * diagnosable failure and a silent one.
 */
process.exitCode = exitCode;
