
import type { NextConfig } from 'next';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true, // Disable next-pwa completely to resolve Next.js 15 App Router build crashes
  buildExcludes: [/app-build-manifest\.json$/, /middleware-build-manifest\.json$/],
});

/**
 * Are we building the bundle that Tauri wraps?
 *
 * `TAURI_PLATFORM` is set by the Tauri CLI itself; `IS_TAURI` is the manual
 * escape hatch so `IS_TAURI=true npm run build` reproduces the native bundle
 * without going through `tauri build` — which is how you debug a static-export
 * failure without waiting on a Rust compile.
 */
const isTauri = process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true';

const nextConfig: NextConfig = {
  /**
   * A static export is the only thing Tauri can bundle: the packaged app has no
   * Node server, so `out/` must be complete HTML/JS on disk. This is what forces
   * the two structural rules the rest of the codebase follows — no Server
   * Actions on any dashboard path (see `src/app/actions.ts`) and no unenumerable
   * dynamic segments (see `src/app/dashboard/patients/detail/page.tsx`).
   *
   * The web build keeps its server: leaving `output: 'export'` on permanently
   * would silently kill the marketing site's Server Actions and API routes.
   */
  output: isTauri ? 'export' : undefined,

  /**
   * Directory-style URLs (`/dashboard/patients/detail/index.html`).
   *
   * Without this the export emits `detail.html`, which the Tauri asset protocol
   * will not resolve from a `/dashboard/patients/detail` navigation — every
   * in-app route change would 404 in the packaged build while working perfectly
   * in `npm run dev`.
   */
  trailingSlash: isTauri ? true : undefined,

  /**
   * Type errors fail the build.
   *
   * This was `ignoreBuildErrors: true`, which is a reasonable setting for a
   * prototype and a dangerous one for an EMR: the errors it was hiding included a
   * `cn` that was never imported (a hard render crash on the patient's own records
   * page), a super-admin redirect that read a property of `null` and so never
   * fired, a `useActionState` action invoked with the wrong arguments, and three
   * vital-sign comparisons against string literals the type union did not contain.
   * None of those would have reached a clinician if the compiler had been allowed
   * to speak.
   *
   * Keep it false. If a type error blocks a build, fix the type error.
   */
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    /**
     * Scale build workers to free memory instead of core count.
     *
     * Next spawns one worker per core by default — twelve here — and this build
     * needs several GB. On a machine with most of its RAM already committed the
     * OS kills the build partway through compilation with no output at all, which
     * looks like a broken config rather than a resource limit. Letting Next count
     * available memory instead makes the build slower under pressure rather than
     * dead.
     *
     * `scripts/build-native.mjs` also raises `--max-old-space-size`; the two are
     * complementary — this bounds how many processes exist, that bounds how much
     * heap each one may claim before V8 gives up.
     */
    memoryBasedWorkersCount: true,
  },
  images: {
    /**
     * The Next image optimiser is a server route, so it cannot exist in the
     * export — every `next/image` has to be served as-is in the native builds.
     */
    unoptimized: isTauri ? true : undefined,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.midjourney.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hoirqrkdgbmvpwutwuwj-all.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
