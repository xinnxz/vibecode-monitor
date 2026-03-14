import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile Three.js agar kompatibel dengan Next.js App Router + Turbopack
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],

  // Note: raw-loader untuk GLSL shaders dihapus karena tidak kompatibel dengan Turbopack.
  // Jika nanti butuh GLSL, gunakan pendekatan berbeda (inline string atau URL imports).
};

export default nextConfig;
