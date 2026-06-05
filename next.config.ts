import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Forzar todas las páginas dinámicas para evitar errores de prerenderizado sin env vars
  experimental: {},
  env: {
    // Valores por defecto vacíos para builds locales sin .env.local
    // En producción (Vercel), estas variables se configuran en el proyecto
    NEXT_PUBLIC_SUPABASE_URL:     process.env.NEXT_PUBLIC_SUPABASE_URL     ?? '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
}

export default nextConfig
