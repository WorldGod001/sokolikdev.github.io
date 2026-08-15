/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // ДОБАВЬ ЭТУ СТРОЧКУ
  images: {
    unoptimized: true, // И ЭТУ (чтобы картинки работали)
  },
};

export default nextConfig;
