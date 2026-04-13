import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', '192.168.4.35'],
  output: 'standalone', // Required for Docker deployment
  // Native modules that can't be bundled - must run on server only
  serverExternalPackages: ['canvas', '@vladmandic/face-api'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'ffgetlejrwhpwvwtviqm.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '*.prodigi.com',
      },
      {
        protocol: 'https',
        hostname: '*.floristone.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.ongoody.com',
      },
    ],
  },
};

export default nextConfig;
