import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getApiDestination() {
  const rawUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '').trim();
  if (!rawUrl) {
    return 'http://127.0.0.1:8000/api/:path*';
  }
  let base = rawUrl.replace(/\/+$/, '');
  if (base.endsWith('/api')) {
    base = base.slice(0, -4);
  }
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}/api/:path*`;
  }
  if (base.startsWith('/')) {
    return `${base}/:path*`;
  }
  if (base.startsWith('localhost') || base.startsWith('127.0.0.1')) {
    return `http://${base}/api/:path*`;
  }
  if (base === 'atmosync-api') {
    return 'https://atmosync-api.onrender.com/api/:path*';
  }
  return `https://${base}/api/:path*`;
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src')
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: getApiDestination()
      }
    ];
  }
};

export default nextConfig;

