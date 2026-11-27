import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000/api/v1";

const nextConfig = {
  // ریشهٔ ردیابی فایلها را مشخص میکنیم تا Next هشدار مربوط به مسیر خانهٔ کاربر را ندهد.
  outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
  reactStrictMode: true,
  poweredByHeader: false,
  // محیط توسعه: اجازهٔ منابع HMR از هاست 127.0.0.1 (پیشفرض NEXT فقط localhost را میپذیرد)
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // کتابخانهٔ طراحی بهصورت TS خام صادر میشود؛ باید توسط Next ترانسپایل شود.
  transpilePackages: ["@digital-shopping/ui"],
  // تصاویر رسانهها از /media/products سرو میشوند؛ میزبان خارجی تنها در صورت تنظیم صریح مجاز است.
  images: {
    remotePatterns: [
      ...(process.env.NEXT_PUBLIC_MEDIA_HOSTNAME
        ? [{ protocol: "https", hostname: process.env.NEXT_PUBLIC_MEDIA_HOSTNAME }]
        : []),
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  // تمام درخواستهای /api/* از مرورگر به بکاند پراکسی میشوند؛ کوکیها همان origin باقی میمانند.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_BASE_URL}/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self';${process.env.NODE_ENV === "production" ? " upgrade-insecure-requests;" : ""}`,
          },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["@digital-shopping/ui"],
  },
};

export default nextConfig;
