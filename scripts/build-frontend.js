#!/usr/bin/env node

/**
 * 前端静态构建脚本
 * 专门用于 Cloudflare Pages 部署，暂时移除 API 路由
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 开始前端静态构建...\n');

const apiDir = path.join(__dirname, '..', 'app', 'api');
const tempApiDir = path.join(__dirname, '..', 'temp-api');

try {
  // 1. 备份 API 目录
  if (fs.existsSync(apiDir)) {
    console.log('📦 备份 API 目录...');
    if (fs.existsSync(tempApiDir)) {
      fs.rmSync(tempApiDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempApiDir, { recursive: true });
    fs.renameSync(apiDir, path.join(tempApiDir, 'api'));
    console.log('✅ API 目录已备份到 temp-api/\n');
  }

  // 2. 设置环境变量并构建
  console.log('🔨 开始 Next.js 静态构建...');
  process.env.NODE_ENV = 'production';
  
  execSync('npx next build', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ 静态构建完成！\n');

} catch (error) {
  console.error('❌ 构建失败:', error.message);
  process.exit(1);
} finally {
  // 3. 恢复 API 目录
  if (fs.existsSync(path.join(tempApiDir, 'api'))) {
    console.log('🔄 恢复 API 目录...');
    fs.renameSync(path.join(tempApiDir, 'api'), apiDir);
    fs.rmSync(tempApiDir, { recursive: true, force: true });
    console.log('✅ API 目录已恢复\n');
  }
}

console.log('🎉 前端构建流程完成！');
console.log('📁 静态文件已生成到 out/ 目录');
console.log('🚀 可以部署到 Cloudflare Pages 了！');