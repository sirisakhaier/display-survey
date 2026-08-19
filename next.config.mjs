import { execSync } from 'child_process';

let localGitCommit = 'b0f8e20';
try {
  localGitCommit = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  // fallback
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_GIT_COMMIT: (
      process.env.RAILWAY_GIT_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GIT_COMMIT ||
      localGitCommit
    ).slice(0, 7),
  },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
