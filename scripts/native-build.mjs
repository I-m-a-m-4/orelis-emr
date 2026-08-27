/**
 * Shared machinery for the native (Tauri) build.
 *
 * A Next.js static export cannot contain a Server Action, an API route, or a
 * dynamic segment it cannot enumerate at build time. Orelis has all three — but
 * only on the marketing site and the super-admin console, neither of which
 * belongs in a hospital's desktop app anyway. So the native build temporarily
 * moves those paths out of `src/app`, exports what remains, and puts them back.
 *
 * ## The failure this file is built around
 *
 * The Zeneva codebase this pattern comes from shipped a version where the
 * rename-aside step threw partway through and nothing put the files back. Its
 * repo was left with ~20 routes sitting as `.bak` files, the next deploy went out
 * without them, and every one of those endpoints 404'd in production. The bug was
 * not the rename — it was that recovery depended on a later step running.
 *
 * Three things here make that unrepeatable:
 *
 * 1. **Recovery does not depend on the build succeeding.** `restoreAll()` is the
 *    first thing the prebuild does, so a run that died halfway through last time
 *    is cleaned up before this one starts. A crashed build cannot leave the repo
 *    poisoned for the next one.
 *
 * 2. **State is on disk, not in the manifest.** What to restore is read from
 *    `.native-build-state.json`, so editing the manifest between a failed build
 *    and the recovery does not orphan a file that is no longer listed.
 *
 * 3. **Generated files are tracked separately from moved ones.** The stub root
 *    page has to be deleted on restore, not renamed back, and conflating the two
 *    is how you end up committing a generated file over a real one.
 *
 * ## Why paths leave `src/app` entirely
 *
 * The obvious implementation — rename `src/app/api` to `src/app/api.native-bak`
 * in place, as the reference codebase does for individual files — does not work
 * for directories. A dot is a legal character in a route segment, so App Router
 * reads `super-admin.native-bak/page.tsx` as the route
 * `/super-admin.native-bak` and compiles it exactly as before; the build then
 * fails on the `@/app/actions` import that the rename was supposed to remove
 * from the graph. Renaming a *file* works because `page.tsx.bak` no longer
 * matches a recognised filename, which is why the reference version got away
 * with it. Everything therefore moves to `.native-stash/` outside `src/`, where
 * the router cannot see it at all.
 */

import {
  existsSync,
  renameSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  unlinkSync,
  rmSync,
  rmdirSync,
  mkdirSync,
} from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATE_FILE = join(ROOT, '.native-build-state.json');
/**
 * Where excluded paths live during a native build.
 *
 * Outside `src/` deliberately — see the module comment. Flattened rather than
 * mirrored so restoring never has to recreate intermediate directories.
 */
const STASH_DIR = join(ROOT, '.native-stash');

/** `src/app/api` -> `src__app__api`, so one flat directory holds everything. */
function stashName(rel) {
  return rel.replace(/[\\/]/g, '__');
}

/**
 * Paths moved out of the way for a native build, relative to the repo root.
 *
 * Grouped by *why* — the reason determines whether a path could ever be brought
 * into the native app later. A marketing page is a product decision; a Server
 * Action is a hard technical limit.
 */
export const EXCLUDED_PATHS = [
  // --- Hard technical limits: cannot exist in a static export at all ---
  'src/app/api', // API routes need a Node server
  'src/app/actions.ts', // Server Actions
  'src/app/actions',
  'src/app/sitemap.ts', // server-generated
  'src/app/clinics', // server component, dynamic [id], no generateStaticParams
  'src/app/invite', // same

  // --- Product decision: not part of the clinical app ---
  // The super-admin console is Orelis-internal tenant administration. It also
  // imports Server Actions, so it could not ship natively as written.
  'src/app/super-admin',

  // The marketing site. A clinician who has installed the app does not need the
  // pricing page, and shipping it would bloat the bundle with 3D/animation deps.
  'src/app/about',
  'src/app/blog',
  'src/app/contact',
  'src/app/demo-video',
  'src/app/features',
  'src/app/future',
  'src/app/pitch',
  'src/app/pricing',
  'src/app/privacy',
  'src/app/showcase',
  'src/app/terms',

  // The marketing landing page. Stashed rather than merely excluded because the
  // native build writes its own `src/app/page.tsx` over this path (see
  // GENERATED_FILES) — without stashing it first, the generated stub would
  // clobber committed source and the restore would then delete it outright.
  'src/app/page.tsx',

  // --- Outside src/app, but only reachable from something above ---
  // `ContactForm` imports `submitContactForm` from `src/app/actions.ts`, so it
  // cannot compile once that file is stashed. It lives in `src/components`, but
  // its only importer is `src/app/contact/client-page.tsx`, which is excluded
  // anyway — so stashing it removes a dangling import rather than a feature.
  //
  // Any file that imports a stashed module has to be stashed too. That invariant
  // is checked by `verifyNoDanglingImports()` below, which runs in milliseconds
  // instead of failing five minutes into `next build`.
  'src/components/contact-form.tsx',
];

/**
 * Files written for the native build and deleted afterwards.
 *
 * The root route is the only one: `src/app/page.tsx` is the marketing landing
 * page, and with it excluded the native app would have nothing at `/` — which is
 * where the Tauri window opens. The stub sends the user to the dashboard or the
 * login screen depending on whether they are already signed in.
 */
export const GENERATED_FILES = {
  'src/app/page.tsx': `'use client';

/**
 * GENERATED for the native build by scripts/tauri-prebuild.mjs — do not edit,
 * and do not commit. scripts/tauri-postbuild.mjs deletes this and restores the
 * marketing landing page.
 *
 * The packaged app opens at \`/\`, where the web build serves marketing copy that
 * is not bundled natively. This decides where a launch actually lands.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { LoadingAnimation } from '@/components/layout/loading-animation';

export default function NativeEntry() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [user, loading, router]);

  return <LoadingAnimation />;
}
`,
};

function readState() {
  if (!existsSync(STATE_FILE)) return { moved: [], generated: [] };
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    return {
      moved: Array.isArray(parsed.moved) ? parsed.moved : [],
      generated: Array.isArray(parsed.generated) ? parsed.generated : [],
    };
  } catch {
    // A truncated state file must not block recovery — fall back to the manifest.
    return { moved: [...EXCLUDED_PATHS], generated: Object.keys(GENERATED_FILES) };
  }
}

function writeState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Put every excluded path back and delete every generated file.
 *
 * Safe to call at any time, including when nothing was moved — which is exactly
 * why the prebuild calls it before it starts.
 */
export function restoreAll({ quiet = false } = {}) {
  const state = readState();
  const log = (msg) => {
    if (!quiet) console.log(msg);
  };

  /**
   * Generated files go first, and the order is load-bearing.
   *
   * A generated file can sit at the same path as a stashed one — the root page is
   * exactly that case: `src/app/page.tsx` is stashed, then a stub is written over
   * it. Restoring the stash before deleting the stub would put the real page back
   * and then delete it, losing committed source. Deleting first leaves the path
   * free for the stash to return to.
   */
  let deleted = 0;
  for (const rel of state.generated) {
    const target = join(ROOT, rel);
    if (existsSync(target)) {
      unlinkSync(target);
      deleted++;
    }
  }

  let restored = 0;
  for (const rel of state.moved) {
    const target = join(ROOT, rel);
    const stashed = join(STASH_DIR, stashName(rel));
    if (!existsSync(stashed)) continue;

    // If the build somehow recreated the original, the stash is the truth —
    // an export artefact must never win over committed source.
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
    }
    renameSync(stashed, target);
    restored++;
  }

  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
  // Only remove the stash directory once it is empty, so anything we failed to
  // restore stays on disk and recoverable rather than being deleted. rmdirSync
  // refuses a non-empty directory, which is exactly the check we want.
  if (existsSync(STASH_DIR)) {
    try {
      rmdirSync(STASH_DIR);
    } catch {
      log(`[native-build] ${STASH_DIR} not empty — leaving it for inspection`);
    }
  }

  if (restored || deleted) {
    log(`[native-build] restored ${restored} path(s), removed ${deleted} generated file(s)`);
  }
  return { restored, deleted };
}

/**
 * Fail fast if any surviving file imports a path that is no longer on disk.
 *
 * ## Why this exists
 *
 * Stashing a path removes it from the module graph, but nothing removes the
 * *imports of* it. `src/components/contact-form.tsx` imported
 * `@/app/actions` — stashed — and lives outside `src/app`, so it stayed. With
 * `typescript.ignoreBuildErrors` on, that compiled anyway and the dangling import
 * became a runtime failure in the packaged app. With it off, it fails the build —
 * correctly, but only after a full compile, and with an error that names the
 * importer rather than the exclusion that caused it.
 *
 * This runs right after the moves and reports both halves: what is missing, and
 * which file wants it. The fix is always the same — add the importer to
 * `EXCLUDED_PATHS`, or stop importing across the boundary.
 *
 * ## Scope
 *
 * Only `@/…` aliased imports (`@/*` -> `./src/*` in tsconfig.json). Relative
 * imports cannot cross into a stashed directory without the importer being inside
 * it — and if it is inside, it went with the stash. Bare package specifiers
 * resolve from node_modules and are none of our business.
 */
function verifyNoDanglingImports() {
  /** Extensions and index files a bundler will try, in the order it tries them. */
  const CANDIDATES = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.d.ts'];
  const INDEXES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];

  const resolves = (relFromSrc) => {
    const base = join(ROOT, 'src', relFromSrc);
    for (const ext of CANDIDATES) {
      const candidate = base + ext;
      if (existsSync(candidate) && statSync(candidate).isFile()) return true;
    }
    if (existsSync(base) && statSync(base).isDirectory()) {
      return INDEXES.some((i) => existsSync(join(base, i)));
    }
    return false;
  };

  // `from '@/x'`, `import '@/x'`, `import('@/x')`, `require('@/x')`.
  const IMPORT_RE = /(?:from|import|require)\s*\(?\s*['"]@\/([^'"]+)['"]/g;
  const SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

  const problems = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (SOURCE_RE.test(entry.name)) {
        const text = readFileSync(full, 'utf8');
        for (const [, spec] of text.matchAll(IMPORT_RE)) {
          if (!resolves(spec)) {
            problems.push({ importer: relative(ROOT, full), spec: `@/${spec}` });
          }
        }
      }
    }
  };

  walk(join(ROOT, 'src'));

  if (problems.length) {
    const lines = problems.map((p) => `  ${p.importer} imports ${p.spec}`);
    throw new Error(
      `[native-build] ${problems.length} dangling import(s) after exclusion:\n${lines.join(
        '\n'
      )}\n\nEach importer must either be added to EXCLUDED_PATHS in ` +
        `scripts/native-build.mjs, or stop importing across the native/web boundary.`
    );
  }
}

/**
 * Move every excluded path aside and write the generated stubs.
 *
 * The state file is written *before* the first rename, so a crash during the
 * moves still leaves a complete record of what to undo.
 */
export function moveAside() {
  const present = EXCLUDED_PATHS.filter((rel) => existsSync(join(ROOT, rel)));
  const generated = Object.keys(GENERATED_FILES);

  writeState({ moved: present, generated });
  mkdirSync(STASH_DIR, { recursive: true });

  for (const rel of present) {
    const target = join(ROOT, rel);
    const stashed = join(STASH_DIR, stashName(rel));
    // A leftover stash means restore did not complete; the committed file wins.
    if (existsSync(stashed)) rmSync(stashed, { recursive: true, force: true });
    renameSync(target, stashed);
  }

  for (const [rel, contents] of Object.entries(GENERATED_FILES)) {
    writeFileSync(join(ROOT, rel), contents);
  }

  console.log(
    `[native-build] excluded ${present.length} path(s), generated ${generated.length} file(s)`
  );

  // After the writes, so the generated root page is part of what gets checked.
  // Throws on failure — callers restore in a `finally`, so the repo is left clean.
  verifyNoDanglingImports();
  console.log('[native-build] no dangling imports');

  return { moved: present, generated };
}

export { ROOT, STASH_DIR, STATE_FILE };
