/**
 * 创建初始管理员账户的脚本
 * 在Cloudflare Worker控制台中运行此代码来创建管理员账户
 */

// 密码哈希函数（与Worker中相同）
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'pgs_salt_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 生成ID函数（与Worker中相同）
function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

// 创建管理员账户
async function createAdminUser(env) {
  const adminId = generateId('admin');
  const now = new Date().toISOString();
  
  // 管理员信息
  const adminUser = {
    id: adminId,
    username: 'admin',
    passwordHash: await hashPassword('admin123'), // 默认密码：admin123
    email: 'admin@pgs-log.cn',
    role: 'admin',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  };
  
  // 保存到KV
  await env.ADMIN_USERS.put(`user:admin`, JSON.stringify(adminUser));
  
  console.log('管理员账户创建成功:');
  console.log('用户名: admin');
  console.log('密码: admin123');
  console.log('请登录后立即修改密码！');
  
  return adminUser;
}

// 在Worker中运行此函数
// createAdminUser(env).then(() => console.log('完成'));

/**
 * 使用说明：
 * 
 * 1. 复制working-deploy.js的内容到Cloudflare Worker编辑器
 * 2. 在Worker编辑器的底部添加以下代码：
 * 
 * // 临时创建管理员账户（仅运行一次）
 * addEventListener('fetch', event => {
 *   if (event.request.url.includes('/create-admin')) {
 *     event.respondWith(handleCreateAdmin(event.request, env));
 *   }
 * });
 * 
 * async function handleCreateAdmin(request, env) {
 *   try {
 *     const adminId = generateId('admin');
 *     const now = new Date().toISOString();
 *     
 *     const adminUser = {
 *       id: adminId,
 *       username: 'admin',
 *       passwordHash: await hashPassword('admin123'),
 *       email: 'admin@pgs-log.cn',
 *       role: 'admin',
 *       isActive: true,
 *       createdAt: now,
 *       updatedAt: now,
 *       lastLoginAt: null
 *     };
 *     
 *     await env.ADMIN_USERS.put(`user:admin`, JSON.stringify(adminUser));
 *     
 *     return new Response(JSON.stringify({
 *       success: true,
 *       message: '管理员账户创建成功',
 *       username: 'admin',
 *       password: 'admin123'
 *     }), {
 *       headers: { 'Content-Type': 'application/json' }
 *     });
 *   } catch (error) {
 *     return new Response(JSON.stringify({
 *       success: false,
 *       message: '创建失败: ' + error.message
 *     }), {
 *       status: 500,
 *       headers: { 'Content-Type': 'application/json' }
 *     });
 *   }
 * }
 * 
 * 3. 保存并部署Worker
 * 4. 访问 https://your-worker-domain.workers.dev/create-admin
 * 5. 创建成功后，删除临时代码并重新部署
 * 6. 使用 admin/admin123 登录管理后台
 */
