/** @type {import('next').NextConfig} */
const nextConfig = {
  // 开发环境使用默认配置，生产环境使用静态导出
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true
    },
    // 静态导出时跳过 API 路由
    skipTrailingSlashRedirect: true,
  }),
  // 确保 CSS 处理正确
  transpilePackages: [],
  // 禁用 ESLint 检查以加快构建
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 禁用 TypeScript 检查以加快构建
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;