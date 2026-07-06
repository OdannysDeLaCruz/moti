import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // distDir: 'build',
  allowedDevOrigins: ['localhost', '192.168.1.33', '192.168.0.27', 'https://angie-overliterary-maryellen.ngrok-free.dev'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/duoknfsuz/**',
      },
    ],
  },
};

export default nextConfig;
