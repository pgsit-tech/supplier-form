/**
 * Cloudflare Workers - 供应商申请系统后端 API
 * 
 * 环境变量绑定:
 * - SUPPLIER_APPLICATIONS: KV 命名空间
 * - ADMIN_USERS: KV 命名空间  
 * - ADMIN_SESSIONS: KV 命名空间
 * - JWT_SECRET: JWT 密钥
 * - FRONTEND_URL: 前端域名（用于 CORS）
 */

// 导入工具函数
import { handleCORS, createResponse, generateId, hashPassword, verifyPassword, generateJWT, verifyJWT } from './utils.js';
import { validateSupplierForm, validateLogin, validateStatusUpdate } from './validators.js';

// 路由处理器
const routes = {
  // 供应商申请提交
  'POST /api/submit-form': handleSubmitForm,
  
  // 管理员登录
  'POST /api/admin/login': handleAdminLogin,
  
  // 获取申请列表
  'GET /api/admin/applications': handleGetApplications,
  
  // 更新申请状态
  'PATCH /api/admin/applications/:id/status': handleUpdateApplicationStatus,
  
  // 健康检查
  'GET /api/health': handleHealth,
};

// 主处理函数
export default {
  async fetch(request, env, ctx) {
    try {
      // 处理 CORS 预检请求
      if (request.method === 'OPTIONS') {
        return handleCORS();
      }

      const url = new URL(request.url);
      const method = request.method;
      const path = url.pathname;
      
      // 路由匹配
      const routeKey = `${method} ${path}`;
      let handler = routes[routeKey];
      
      // 处理动态路由
      if (!handler) {
        for (const [route, routeHandler] of Object.entries(routes)) {
          const [routeMethod, routePath] = route.split(' ');
          if (routeMethod === method && matchRoute(routePath, path)) {
            handler = routeHandler;
            break;
          }
        }
      }
      
      if (!handler) {
        return createResponse({ 
          success: false, 
          message: 'API 端点不存在' 
        }, 404);
      }
      
      // 执行处理器
      const response = await handler(request, env, ctx);
      
      // 添加 CORS 头
      return addCORSHeaders(response, env.FRONTEND_URL);
      
    } catch (error) {
      console.error('Worker 错误:', error);
      return createResponse({
        success: false,
        message: '服务器内部错误'
      }, 500);
    }
  }
};

// 路由匹配函数
function matchRoute(routePath, actualPath) {
  const routeParts = routePath.split('/');
  const actualParts = actualPath.split('/');
  
  if (routeParts.length !== actualParts.length) {
    return false;
  }
  
  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      continue; // 动态参数，跳过
    }
    if (routeParts[i] !== actualParts[i]) {
      return false;
    }
  }
  
  return true;
}

// 提取路由参数
function extractParams(routePath, actualPath) {
  const routeParts = routePath.split('/');
  const actualParts = actualPath.split('/');
  const params = {};
  
  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      const paramName = routeParts[i].substring(1);
      params[paramName] = actualParts[i];
    }
  }
  
  return params;
}

// 添加 CORS 头
function addCORSHeaders(response, frontendUrl) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': frontendUrl || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  // 创建新的响应对象，添加 CORS 头
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers),
      ...corsHeaders
    }
  });
  
  return newResponse;
}

// ==================== 处理器函数 ====================

// 健康检查
async function handleHealth(request, env) {
  return createResponse({
    success: true,
    message: '服务正常运行',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}

// 处理供应商申请提交
async function handleSubmitForm(request, env) {
  try {
    const body = await request.json();
    
    // 验证表单数据
    const validation = validateSupplierForm(body);
    if (!validation.success) {
      return createResponse({
        success: false,
        message: '表单验证失败',
        errors: validation.errors
      }, 400);
    }
    
    // 生成申请 ID
    const applicationId = generateId('app');
    const now = new Date().toISOString();
    
    // 构建申请数据
    const applicationData = {
      id: applicationId,
      ...validation.data,
      status: 'pending',
      submittedAt: now,
      updatedAt: now
    };
    
    // 保存到 KV
    await env.SUPPLIER_APPLICATIONS.put(
      `application:${applicationId}`,
      JSON.stringify(applicationData)
    );
    
    // 更新索引
    await updateApplicationIndexes(env, applicationData, 'create');
    
    return createResponse({
      success: true,
      message: '申请提交成功',
      data: {
        id: applicationId,
        submittedAt: now
      }
    });
    
  } catch (error) {
    console.error('提交申请错误:', error);
    return createResponse({
      success: false,
      message: '提交失败，请稍后重试'
    }, 500);
  }
}

// 处理管理员登录
async function handleAdminLogin(request, env) {
  try {
    const body = await request.json();
    
    // 验证登录数据
    const validation = validateLogin(body);
    if (!validation.success) {
      return createResponse({
        success: false,
        message: '请求数据格式错误',
        errors: validation.errors
      }, 400);
    }
    
    const { username, password } = validation.data;
    
    // 从 KV 获取用户信息
    const userKey = `user:${username}`;
    const userData = await env.ADMIN_USERS.get(userKey);
    
    if (!userData) {
      return createResponse({
        success: false,
        message: '用户名或密码错误'
      }, 401);
    }
    
    const user = JSON.parse(userData);
    
    // 验证密码
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return createResponse({
        success: false,
        message: '用户名或密码错误'
      }, 401);
    }
    
    // 检查用户状态
    if (!user.isActive) {
      return createResponse({
        success: false,
        message: '账户已被禁用'
      }, 401);
    }
    
    // 生成会话
    const sessionId = generateId('sess');
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24小时
    
    const sessionData = {
      sessionId,
      userId: user.id,
      username: user.username,
      role: user.role,
      createdAt: now,
      expiresAt,
      lastAccessAt: now,
      ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown',
      userAgent: request.headers.get('User-Agent') || 'unknown'
    };
    
    // 保存会话到 KV
    await env.ADMIN_SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      { expirationTtl: 24 * 60 * 60 } // 24小时 TTL
    );
    
    // 更新用户最后登录时间
    user.lastLoginAt = now;
    await env.ADMIN_USERS.put(userKey, JSON.stringify(user));
    
    // 生成 JWT token
    const token = await generateJWT({
      sessionId,
      userId: user.id,
      username: user.username,
      role: user.role
    }, env.JWT_SECRET);
    
    // 返回用户信息（不包含密码）
    const { passwordHash, ...userInfo } = user;
    
    return createResponse({
      success: true,
      message: '登录成功',
      token,
      user: userInfo
    });
    
  } catch (error) {
    console.error('登录错误:', error);
    return createResponse({
      success: false,
      message: '登录失败，请稍后重试'
    }, 500);
  }
}

// 处理获取申请列表
async function handleGetApplications(request, env) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request, env);
    if (!authResult.success) {
      return createResponse({
        success: false,
        message: authResult.message
      }, 401);
    }
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    // 获取申请列表
    let applicationIds = [];
    
    if (status && status !== 'all') {
      // 按状态过滤
      const statusIds = await env.SUPPLIER_APPLICATIONS.get(`applications:by_status:${status}`);
      applicationIds = statusIds ? JSON.parse(statusIds) : [];
    } else {
      // 获取所有申请
      const allIds = await env.SUPPLIER_APPLICATIONS.get('applications:list');
      applicationIds = allIds ? JSON.parse(allIds) : [];
    }
    
    // 批量获取申请数据
    const applications = [];
    for (const id of applicationIds) {
      const appData = await env.SUPPLIER_APPLICATIONS.get(`application:${id}`);
      if (appData) {
        const app = JSON.parse(appData);
        
        // 搜索过滤
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesSearch = 
            app.supplierName.toLowerCase().includes(searchLower) ||
            app.applicantEmail.toLowerCase().includes(searchLower) ||
            app.contactPersonAndTitle.toLowerCase().includes(searchLower);
          
          if (matchesSearch) {
            applications.push(app);
          }
        } else {
          applications.push(app);
        }
      }
    }
    
    // 按提交时间倒序排列
    applications.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    
    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedApplications = applications.slice(startIndex, endIndex);
    
    // 获取统计信息
    const statsData = await env.SUPPLIER_APPLICATIONS.get('applications:stats');
    const stats = statsData ? JSON.parse(statsData) : {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };
    
    return createResponse({
      success: true,
      applications: paginatedApplications,
      pagination: {
        page,
        limit,
        total: applications.length,
        totalPages: Math.ceil(applications.length / limit)
      },
      stats
    });
    
  } catch (error) {
    console.error('获取申请列表错误:', error);
    return createResponse({
      success: false,
      message: '获取申请列表失败'
    }, 500);
  }
}

// 处理更新申请状态
async function handleUpdateApplicationStatus(request, env) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request, env);
    if (!authResult.success) {
      return createResponse({
        success: false,
        message: authResult.message
      }, 401);
    }
    
    // 提取路由参数
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const applicationId = pathParts[4]; // /api/admin/applications/:id/status
    
    const body = await request.json();
    
    // 验证状态更新数据
    const validation = validateStatusUpdate(body);
    if (!validation.success) {
      return createResponse({
        success: false,
        message: '请求数据格式错误',
        errors: validation.errors
      }, 400);
    }
    
    // 获取申请数据
    const appData = await env.SUPPLIER_APPLICATIONS.get(`application:${applicationId}`);
    if (!appData) {
      return createResponse({
        success: false,
        message: '申请不存在'
      }, 404);
    }
    
    const application = JSON.parse(appData);
    const oldStatus = application.status;
    const newStatus = validation.data.status;
    
    // 更新申请状态
    application.status = newStatus;
    application.updatedAt = new Date().toISOString();
    application.updatedBy = authResult.user.username;
    
    // 保存更新后的数据
    await env.SUPPLIER_APPLICATIONS.put(
      `application:${applicationId}`,
      JSON.stringify(application)
    );
    
    // 更新索引
    await updateApplicationIndexes(env, application, 'update', oldStatus);
    
    return createResponse({
      success: true,
      message: '状态更新成功',
      data: {
        id: applicationId,
        status: newStatus,
        updatedBy: authResult.user.username,
        updatedAt: application.updatedAt
      }
    });
    
  } catch (error) {
    console.error('状态更新错误:', error);
    return createResponse({
      success: false,
      message: '状态更新失败'
    }, 500);
  }
}

// ==================== 工具函数 ====================

// 验证管理员权限
async function verifyAdminAuth(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, message: '缺少认证令牌' };
    }
    
    const token = authHeader.substring(7);
    
    // 验证 JWT
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload) {
      return { success: false, message: '无效的认证令牌' };
    }
    
    // 验证会话
    const sessionData = await env.ADMIN_SESSIONS.get(`session:${payload.sessionId}`);
    if (!sessionData) {
      return { success: false, message: '会话已过期' };
    }
    
    const session = JSON.parse(sessionData);
    
    // 检查会话是否过期
    if (new Date(session.expiresAt) < new Date()) {
      return { success: false, message: '会话已过期' };
    }
    
    // 更新最后访问时间
    session.lastAccessAt = new Date().toISOString();
    await env.ADMIN_SESSIONS.put(
      `session:${payload.sessionId}`,
      JSON.stringify(session),
      { expirationTtl: 24 * 60 * 60 }
    );
    
    return {
      success: true,
      user: {
        id: payload.userId,
        username: payload.username,
        role: payload.role
      }
    };
    
  } catch (error) {
    console.error('权限验证错误:', error);
    return { success: false, message: '权限验证失败' };
  }
}

// 更新申请索引
async function updateApplicationIndexes(env, application, operation, oldStatus = null) {
  try {
    // 更新总列表
    const listKey = 'applications:list';
    let allIds = await env.SUPPLIER_APPLICATIONS.get(listKey);
    allIds = allIds ? JSON.parse(allIds) : [];
    
    if (operation === 'create') {
      allIds.unshift(application.id);
    }
    
    await env.SUPPLIER_APPLICATIONS.put(listKey, JSON.stringify(allIds));
    
    // 更新状态索引
    const statusKey = `applications:by_status:${application.status}`;
    let statusIds = await env.SUPPLIER_APPLICATIONS.get(statusKey);
    statusIds = statusIds ? JSON.parse(statusIds) : [];
    
    if (operation === 'create') {
      statusIds.unshift(application.id);
    } else if (operation === 'update' && oldStatus !== application.status) {
      // 从旧状态列表中移除
      if (oldStatus) {
        const oldStatusKey = `applications:by_status:${oldStatus}`;
        let oldStatusIds = await env.SUPPLIER_APPLICATIONS.get(oldStatusKey);
        oldStatusIds = oldStatusIds ? JSON.parse(oldStatusIds) : [];
        oldStatusIds = oldStatusIds.filter(id => id !== application.id);
        await env.SUPPLIER_APPLICATIONS.put(oldStatusKey, JSON.stringify(oldStatusIds));
      }
      
      // 添加到新状态列表
      if (!statusIds.includes(application.id)) {
        statusIds.unshift(application.id);
      }
    }
    
    await env.SUPPLIER_APPLICATIONS.put(statusKey, JSON.stringify(statusIds));
    
    // 更新统计信息
    await updateApplicationStats(env);
    
  } catch (error) {
    console.error('更新索引错误:', error);
  }
}

// 更新申请统计信息
async function updateApplicationStats(env) {
  try {
    const allIds = await env.SUPPLIER_APPLICATIONS.get('applications:list');
    const applicationIds = allIds ? JSON.parse(allIds) : [];
    
    const stats = {
      total: applicationIds.length,
      pending: 0,
      approved: 0,
      rejected: 0
    };
    
    // 统计各状态数量
    for (const status of ['pending', 'approved', 'rejected']) {
      const statusIds = await env.SUPPLIER_APPLICATIONS.get(`applications:by_status:${status}`);
      const ids = statusIds ? JSON.parse(statusIds) : [];
      stats[status] = ids.length;
    }
    
    await env.SUPPLIER_APPLICATIONS.put('applications:stats', JSON.stringify(stats));
    
  } catch (error) {
    console.error('更新统计信息错误:', error);
  }
}