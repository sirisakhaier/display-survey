import { execSync } from 'child_process';

let gitCommit = '478e520';
try {
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  gitCommit = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || '478e520';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
  },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;
