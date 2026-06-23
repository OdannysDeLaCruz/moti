import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // distDir: 'build',
  allowedDevOrigins: ['localhost', '192.168.1.33', 'https://angie-overliterary-maryellen.ngrok-free.dev'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/duoknfsuz/**', // O un path más genérico si usas rutas dinámicas
      },
    ],
  },
};

export default nextConfig;
