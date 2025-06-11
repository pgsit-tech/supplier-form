#!/usr/bin/env node

/**
 * Cloudflare Pages 部署状态检查脚本
 * 使用 Cloudflare API 检查部署状态
 */

const https = require('https');

// 配置信息 - 请替换为您的实际值
const CONFIG = {
  ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '5c86321351ad27065d881d46691a5503',
  PROJECT_NAME: process.env.CLOUDFLARE_PROJECT_NAME || 'supplier-form',
  API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || 'tQPTM1HnZFfrSb-I6GZiZM_lJJUJmHiwoWWT35FS'
};

/**
 * 发送 HTTP 请求
 */
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

/**
 * 获取项目部署列表
 */
async function getDeployments() {
  const options = {
    hostname: 'api.cloudflare.com',
    path: `/client/v4/accounts/${CONFIG.ACCOUNT_ID}/pages/projects/${CONFIG.PROJECT_NAME}/deployments`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CONFIG.API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(options);
    
    if (response.status === 200 && response.data.success) {
      return response.data.result;
    } else {
      throw new Error(`API 请求失败: ${response.status} - ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    throw new Error(`获取部署列表失败: ${error.message}`);
  }
}

/**
 * 获取特定部署的详细信息
 */
async function getDeploymentDetails(deploymentId) {
  const options = {
    hostname: 'api.cloudflare.com',
    path: `/client/v4/accounts/${CONFIG.ACCOUNT_ID}/pages/projects/${CONFIG.PROJECT_NAME}/deployments/${deploymentId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CONFIG.API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(options);
    
    if (response.status === 200 && response.data.success) {
      return response.data.result;
    } else {
      throw new Error(`API 请求失败: ${response.status} - ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    throw new Error(`获取部署详情失败: ${error.message}`);
  }
}

/**
 * 获取部署日志
 */
async function getDeploymentLogs(deploymentId) {
  const options = {
    hostname: 'api.cloudflare.com',
    path: `/client/v4/accounts/${CONFIG.ACCOUNT_ID}/pages/projects/${CONFIG.PROJECT_NAME}/deployments/${deploymentId}/history/logs`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CONFIG.API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(options);
    
    if (response.status === 200 && response.data.success) {
      return response.data.result;
    } else {
      throw new Error(`API 请求失败: ${response.status} - ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    throw new Error(`获取部署日志失败: ${error.message}`);
  }
}

/**
 * 格式化时间
 */
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

/**
 * 获取状态图标
 */
function getStatusIcon(status) {
  const icons = {
    'success': '✅',
    'failure': '❌',
    'active': '🔄',
    'canceled': '⏹️',
    'skipped': '⏭️'
  };
  return icons[status] || '❓';
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 检查 Cloudflare Pages 部署状态...\n');
  
  // 验证配置
  if (CONFIG.ACCOUNT_ID === 'your-account-id' || CONFIG.API_TOKEN === 'your-api-token') {
    console.log('❌ 请先配置环境变量:');
    console.log('   CLOUDFLARE_ACCOUNT_ID=your-account-id');
    console.log('   CLOUDFLARE_API_TOKEN=your-api-token');
    console.log('   CLOUDFLARE_PROJECT_NAME=supplier-form-system');
    process.exit(1);
  }

  try {
    // 获取最近的部署
    console.log('📋 获取部署列表...');
    const deployments = await getDeployments();
    
    if (!deployments || deployments.length === 0) {
      console.log('❌ 没有找到任何部署');
      return;
    }

    // 显示最近的 5 个部署
    console.log(`\n📊 最近的部署 (共 ${deployments.length} 个):\n`);
    
    const recentDeployments = deployments.slice(0, 5);
    
    for (const deployment of recentDeployments) {
      const icon = getStatusIcon(deployment.latest_stage.status);
      const time = formatTime(deployment.created_on);
      const branch = deployment.deployment_trigger.metadata?.branch || 'unknown';
      const commit = deployment.deployment_trigger.metadata?.commit_hash?.substring(0, 7) || 'unknown';
      
      console.log(`${icon} ${deployment.latest_stage.status.toUpperCase()}`);
      console.log(`   ID: ${deployment.id}`);
      console.log(`   分支: ${branch}`);
      console.log(`   提交: ${commit}`);
      console.log(`   时间: ${time}`);
      console.log(`   URL: ${deployment.url || 'N/A'}`);
      console.log('');
    }

    // 获取最新部署的详细信息
    const latestDeployment = deployments[0];
    console.log('🔍 获取最新部署详情...\n');
    
    const details = await getDeploymentDetails(latestDeployment.id);
    
    console.log('📋 最新部署详情:');
    console.log(`   状态: ${getStatusIcon(details.latest_stage.status)} ${details.latest_stage.status}`);
    console.log(`   阶段: ${details.latest_stage.name}`);
    console.log(`   开始时间: ${formatTime(details.latest_stage.started_on)}`);
    
    if (details.latest_stage.ended_on) {
      console.log(`   结束时间: ${formatTime(details.latest_stage.ended_on)}`);
      const duration = new Date(details.latest_stage.ended_on) - new Date(details.latest_stage.started_on);
      console.log(`   持续时间: ${Math.round(duration / 1000)}秒`);
    }
    
    if (details.production_url) {
      console.log(`   生产URL: ${details.production_url}`);
    }
    
    // 如果部署失败，获取日志
    if (details.latest_stage.status === 'failure') {
      console.log('\n📝 获取错误日志...');
      try {
        const logs = await getDeploymentLogs(latestDeployment.id);
        if (logs && logs.data && logs.data.length > 0) {
          console.log('\n❌ 部署错误日志:');
          logs.data.slice(-10).forEach(log => {
            console.log(`   ${formatTime(log.ts)}: ${log.line}`);
          });
        }
      } catch (logError) {
        console.log(`   无法获取日志: ${logError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ 检查部署状态失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  getDeployments,
  getDeploymentDetails,
  getDeploymentLogs
};