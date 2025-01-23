import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    TPNSWAPIKEY: process.env.TPNSWAPIKEY,
  }
};

export default nextConfig;
