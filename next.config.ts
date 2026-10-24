import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Traced server bundle for the Docker image, enabled only by the Dockerfile.
  // Tracing resolves pnpm's store through symlinks, which Windows refuses
  // without developer mode: switching it on unconditionally makes `pnpm build`
  // fail with EPERM on the machine this repo is developed on, and nothing
  // outside the container build reads `.next/standalone` anyway.
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  // The catalogue's taxonomy lived under admin until it moved next to the products.
  redirects: async () =>
    ['categories', 'brands', 'locations'].map((section) => ({
      source: `/admin/${section}`,
      destination: `/catalog/${section}`,
      permanent: true,
    })),
};

export default createNextIntlPlugin()(nextConfig);
