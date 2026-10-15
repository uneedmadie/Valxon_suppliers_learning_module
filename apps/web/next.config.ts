/**
 * Konfigurace Next.js. Frontend volá REST API přímo (CORS povolen jen pro tento origin);
 * obrázky produktů se načítají z webů dodavatelů, proto se nepoužívá optimalizace next/image.
 */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
