import { ImageResponse } from 'next/og';

/**
 * Generate the favicon once at build time rather than per request.
 *
 * `ImageResponse` is a route handler, and a static export refuses to emit one
 * without being told it never varies: the native build fails with "export const
 * dynamic = force-static not configured on route /icon". The icon is a constant,
 * so baking it is also what we want on the web — one less edge invocation per
 * cold cache.
 *
 * There is deliberately no `runtime = 'edge'` here. Pinning the edge runtime
 * contradicts `force-static` — Next warns that the two are incompatible and then
 * lists `/icon` as `ƒ (Dynamic)`, meaning static generation was silently switched
 * off for it. `next/og` runs on the Node runtime, so dropping the pin is what
 * actually makes this route static in both builds.
 */
export const dynamic = 'force-static';

// Image metadata
export const size = {
    width: 32,
    height: 32,
};

export const contentType = 'image/png';

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    background: '#f97316', // orange-500
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '20%',
                }}
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 .2.3" />
                    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                    <circle cx="20" cy="10" r="2" />
                </svg>
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    );
}
