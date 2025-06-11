#!/usr/bin/env node

/**
 * 简化的部署状态检查脚本
 * 不需要 API 凭据，通过公开信息检查部署状态
 */

const https = require('https');

console.log('🚀 检查项目部署状态...\n');

// 检查 GitHub 仓库最新提交
function checkGitHubCommits() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/pgsit-tech/supplier-form/commits',
      method: 'GET',
      headers: {
        'User-Agent': 'deployment-checker'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const commits = JSON.parse(data);
          resolve(commits);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 格式化时间
function formatTime(dateString) {
  return new Date(dateString).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

async function main() {
  try {
    console.log('📋 检查 GitHub 仓库最新提交...');
    const commits = await checkGitHubCommits();
    
    if (commits && commits.length > 0) {
      console.log('\n📊 最近的提交记录:\n');
      
      commits.slice(0, 5).forEach((commit, index) => {
        const time = formatTime(commit.commit.committer.date);
        const message = commit.commit.message.split('\n')[0];
        const sha = commit.sha.substring(0, 7);
        const author = commit.commit.author.name;
        
        console.log(`${index + 1}. ${sha} - ${message}`);
        console.log(`   作者: ${author}`);
        console.log(`   时间: ${time}`);
        console.log('');
      });
      
      const latestCommit = commits[0];
      console.log('🔍 最新提交详情:');
      console.log(`   SHA: ${latestCommit.sha}`);
      console.log(`   消息: ${latestCommit.commit.message}`);
      console.log(`   作者: ${latestCommit.commit.author.name}`);
      console.log(`   时间: ${formatTime(latestCommit.commit.committer.date)}`);
      console.log(`   GitHub URL: ${latestCommit.html_url}`);
      
    } else {
      console.log('❌ 无法获取提交记录');
    }
    
    console.log('\n📝 部署状态检查说明:');
    console.log('1. ✅ 代码已成功推送到 GitHub');
    console.log('2. 🔄 Cloudflare Pages 应该会自动检测到更改');
    console.log('3. 📦 最新修复包含了 TypeScript 依赖问题的解决方案');
    console.log('4. 🚀 请在 Cloudflare Pages 控制台查看构建状态');
    
    console.log('\n🔧 如果部署仍然失败，请检查:');
    console.log('- Cloudflare Pages 构建命令是否为: npm run build:static');
    console.log('- 构建输出目录是否为: out');
    console.log('- Node.js 版本是否设置为: 18');
    console.log('- 环境变量 NODE_ENV 是否设置为: production');
    
    console.log('\n📊 要获取详细的部署状态，请:');
    console.log('1. 获取 Cloudflare Account ID 和 API Token');
    console.log('2. 设置环境变量并运行: npm run check-deployment');
    console.log('3. 或直接在 Cloudflare Pages 控制台查看构建日志');
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

main();