/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    images: { unoptimized: true },
    transpilePackages: ['firebase', 'three', '@react-three/fiber', '@react-three/drei', 'lucide-react']
};

export default nextConfig;
