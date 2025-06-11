/** @type {import('next').NextConfig} */
const nextConfig = {
  // 开发环境使用默认配置，生产环境使用静态导出
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true
    }
  })
};

module.exports = nextConfig;