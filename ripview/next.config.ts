import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /**
     * Import `.svg` files as React components via SVGR, so the network map can
     * be given a live `viewBox` and have its station nodes styled and clicked.
     */
    webpack(config) {
        const fileLoaderRule = config.module.rules.find(
            (rule: { test?: { test?: (path: string) => boolean } }) => rule.test?.test?.('.svg')
        );
        config.module.rules.push({
            test: /\.svg$/,
            use: ['@svgr/webpack'],
        });
        // The file loader would otherwise also claim .svg.
        if (fileLoaderRule) {
            fileLoaderRule.exclude = /\.svg$/i;
        }
        return config;
    },

    /*
     * Note: there is deliberately no `env` block here.
     *
     * The previous config declared `env: { TPNSWAPIKEY }`, which inlines the
     * value into any bundle that references `process.env.TPNSWAPIKEY`. Nothing
     * leaked, because only the server module read it — but one stray reference
     * from a client component would have published the key in the JavaScript
     * sent to browsers. Next.js reads `.env` server-side without this, so the
     * key now exists only where it is used: src/lib/tfnsw/client.ts.
     */

    async redirects() {
        return [
            // The map moved from /mapInput to /map; keep old links working.
            { source: '/mapInput', destination: '/map', permanent: true },
        ];
    },
};

export default nextConfig;
