const BASE_PATH = "/ai-self-eval";

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
};

export default nextConfig;
