/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "oxwsgzyrfsriqsknhgku.supabase.co", pathname: "/storage/v1/object/public/**" }
    ]
  }
};

export default nextConfig;
