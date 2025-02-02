import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack(config) {
    const fileLoaderRule = config.module.rules.find((rule: { test: { test: (arg0: string) => any; }; }) =>
      rule.test?.test?.('.svg'),
    )
    config.module.rules.push(
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      },
    )
    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i
    return config
  },
  env: {
    TPNSWAPIKEY: process.env.TPNSWAPIKEY,
  }
};

export default nextConfig;
