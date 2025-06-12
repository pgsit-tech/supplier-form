/**
 * Cloudflare Workers - 供应商申请系统
 * 完全重写版本 - 确保所有功能正常工作
 * 
 * 环境变量要求:
 * - SUPPLIER_APPLICATIONS: KV 命名空间
 * - ADMIN_USERS: KV 命名空间  
 * - ADMIN_SESSIONS: KV 命名空间
 * - SYSTEM_CONFIG: KV 命名空间
 * - JWT_SECRET: JWT 密钥
 * - FRONTEND_URL: 前端域名 (https://spcode.pgs-log.cn)
 */

// ==================== 工具函数 ====================

function createResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}

function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'pgs_salt_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

// ==================== JWT 处理 ====================

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str) {
  str += '='.repeat((4 - str.length % 4) % 4);
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

async function createHMACSignature(data, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  return base64UrlEncode(String.fromCharCode(...signatureArray));
}

async function generateJWT(payload, secret) {
  try {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + (24 * 60 * 60),
      iss: 'pgs-supplier-system'
    };
    
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = await createHMACSignature(data, secret);
    
    return `${data}.${signature}`;
  } catch (error) {
    console.error('JWT生成错误:', error);
    return null;
  }
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await createHMACSignature(data, secret);
    
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    
    return payload;
  } catch (error) {
    console.error('JWT验证错误:', error);
    return null;
  }
}

// ==================== 验证函数 ====================

function validateSupplierForm(data) {
  const errors = [];
  const validatedData = {};
  
  // 申请人邮箱
  if (!data.applicantEmail || !isValidEmail(data.applicantEmail)) {
    errors.push({ field: 'applicantEmail', message: '请输入有效的申请人邮箱' });
  } else {
    validatedData.applicantEmail = sanitizeString(data.applicantEmail);
  }
  
  // 申请人分支
  const validBranches = ['SHA', 'BJS', 'CAN', 'SZX', 'NGB', 'XMN', 'QD', 'TJ'];
  if (!data.applicantBranch || !validBranches.includes(data.applicantBranch)) {
    errors.push({ field: 'applicantBranch', message: '请选择有效的申请人分支' });
  } else {
    validatedData.applicantBranch = data.applicantBranch;
  }
  
  // 供应商名称
  if (!data.supplierName || data.supplierName.trim().length < 2) {
    errors.push({ field: 'supplierName', message: '供应商名称至少需要2个字符' });
  } else {
    validatedData.supplierName = sanitizeString(data.supplierName);
  }
  
  // 供应商地址
  if (!data.supplierAddress || data.supplierAddress.trim().length < 5) {
    errors.push({ field: 'supplierAddress', message: '供应商地址至少需要5个字符' });
  } else {
    validatedData.supplierAddress = sanitizeString(data.supplierAddress);
  }
  
  // 联系人及职务（可选）
  validatedData.contactPersonAndTitle = data.contactPersonAndTitle ? sanitizeString(data.contactPersonAndTitle) : '';
  
  // 联系电话（可选）
  validatedData.contactPhone = data.contactPhone ? sanitizeString(data.contactPhone) : '';
  
  // 联系邮箱（可选）
  if (data.contactEmail && data.contactEmail.trim() && !isValidEmail(data.contactEmail)) {
    errors.push({ field: 'contactEmail', message: '请输入有效的联系邮箱' });
  } else {
    validatedData.contactEmail = data.contactEmail ? sanitizeString(data.contactEmail) : '';
  }
  
  // 是否签署协议
  if (!data.agreementSigned || !['yes', 'no'].includes(data.agreementSigned)) {
    errors.push({ field: 'agreementSigned', message: '请选择是否签署协议' });
  } else {
    validatedData.agreementSigned = data.agreementSigned;
  }
  
  // 主营业务
  const validBusiness = ['agent', 'booking', 'warehouse', 'transport', 'customs', 'other'];
  if (!Array.isArray(data.mainBusiness) || data.mainBusiness.length === 0) {
    errors.push({ field: 'mainBusiness', message: '请至少选择一项主营业务' });
  } else if (data.mainBusiness.some(b => !validBusiness.includes(b))) {
    errors.push({ field: 'mainBusiness', message: '包含无效的主营业务选项' });
  } else {
    validatedData.mainBusiness = data.mainBusiness;
  }
  
  // 使用原因
  if (!data.usageReason || data.usageReason.trim().length < 10) {
    errors.push({ field: 'usageReason', message: '使用原因至少需要10个字符' });
  } else {
    validatedData.usageReason = sanitizeString(data.usageReason);
  }
  
  // 供应商来源
  if (!data.supplierSource || data.supplierSource.trim().length < 5) {
    errors.push({ field: 'supplierSource', message: '供应商来源至少需要5个字符' });
  } else {
    validatedData.supplierSource = sanitizeString(data.supplierSource);
  }
  
  // FM3000代码（可选）
  validatedData.fm3000Code = data.fm3000Code ? sanitizeString(data.fm3000Code) : '';
  
  return {
    success: errors.length === 0,
    data: validatedData,
    errors
  };
}

function validateLogin(data) {
  const errors = [];
  const validatedData = {};

  if (!data.username || data.username.trim().length < 3) {
    errors.push({ field: 'username', message: '用户名至少需要3个字符' });
  } else {
    validatedData.username = sanitizeString(data.username);
  }

  if (!data.password || data.password.length < 6) {
    errors.push({ field: 'password', message: '密码至少需要6个字符' });
  } else {
    validatedData.password = data.password;
  }

  return {
    success: errors.length === 0,
    data: validatedData,
    errors
  };
}

function validateSystemConfig(data) {
  const errors = [];
  const validatedData = {};
  
  if (!data.title || data.title.trim().length < 2 || data.title.trim().length > 50) {
    errors.push({ field: 'title', message: '系统标题长度应在2-50个字符之间' });
  } else {
    validatedData.title = sanitizeString(data.title);
  }
  
  if (!data.subtitle || data.subtitle.trim().length < 2 || data.subtitle.trim().length > 30) {
    errors.push({ field: 'subtitle', message: '系统副标题长度应在2-30个字符之间' });
  } else {
    validatedData.subtitle = sanitizeString(data.subtitle);
  }
  
  if (!data.description || data.description.trim().length < 10 || data.description.trim().length > 200) {
    errors.push({ field: 'description', message: '系统描述长度应在10-200个字符之间' });
  } else {
    validatedData.description = sanitizeString(data.description);
  }
  
  return {
    success: errors.length === 0,
    data: validatedData,
    errors
  };
}

// ==================== API 处理函数 ====================

async function handleHealth(request, env) {
  return createResponse({
    success: true,
    message: '服务正常运行',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
}

async function handleSubmitForm(request, env) {
  try {
    const body = await request.json();
    const validation = validateSupplierForm(body);

    if (!validation.success) {
      return createResponse({
        success: false,
        message: '表单验证失败',
        errors: validation.errors
      }, 400);
    }

    const applicationId = generateId('app');
    const now = new Date().toISOString();

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

async function handleAdminLogin(request, env) {
  try {
    const body = await request.json();
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
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

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
      { expirationTtl: 24 * 60 * 60 }
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

async function verifyAdminAuth(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, message: '缺少认证令牌' };
    }

    const token = authHeader.substring(7);
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

async function handleGetSystemConfig(request, env) {
  try {
    const authResult = await verifyAdminAuth(request, env);
    if (!authResult.success) {
      return createResponse({
        success: false,
        message: authResult.message
      }, 401);
    }

    // 获取系统配置
    const configData = await env.SYSTEM_CONFIG.get('system_config');

    let config = {
      title: '供应商申请系统',
      subtitle: 'PGS物流',
      description: 'PGS物流供应商申请管理系统，提供供应商信息提交和审批管理功能'
    };

    if (configData) {
      const savedConfig = JSON.parse(configData);
      config = { ...config, ...savedConfig };
    }

    return createResponse({
      success: true,
      config: config
    });

  } catch (error) {
    console.error('获取系统配置错误:', error);
    return createResponse({
      success: false,
      message: '获取系统配置失败'
    }, 500);
  }
}

async function handleUpdateSystemConfig(request, env) {
  try {
    const authResult = await verifyAdminAuth(request, env);
    if (!authResult.success) {
      return createResponse({
        success: false,
        message: authResult.message
      }, 401);
    }

    const body = await request.json();
    const validation = validateSystemConfig(body);

    if (!validation.success) {
      return createResponse({
        success: false,
        message: '配置数据格式错误',
        errors: validation.errors
      }, 400);
    }

    const config = {
      ...validation.data,
      updatedAt: new Date().toISOString(),
      updatedBy: authResult.user.username
    };

    // 保存配置
    await env.SYSTEM_CONFIG.put('system_config', JSON.stringify(config));

    return createResponse({
      success: true,
      message: '系统配置更新成功',
      config: config
    });

  } catch (error) {
    console.error('更新系统配置错误:', error);
    return createResponse({
      success: false,
      message: '更新系统配置失败，请稍后重试'
    }, 500);
  }
}

async function handleGetApplications(request, env) {
  try {
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
      const statusIds = await env.SUPPLIER_APPLICATIONS.get(`applications:by_status:${status}`);
      applicationIds = statusIds ? JSON.parse(statusIds) : [];
    } else {
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
            (app.contactPersonAndTitle && app.contactPersonAndTitle.toLowerCase().includes(searchLower));

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

async function handleUpdateApplicationStatus(request, env) {
  try {
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
    if (!body.status || !['pending', 'approved', 'rejected'].includes(body.status)) {
      return createResponse({
        success: false,
        message: '请选择有效的状态'
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
    const newStatus = body.status;

    // 更新申请状态
    application.status = newStatus;
    application.updatedAt = new Date().toISOString();
    application.updatedBy = authResult.user.username;
    if (body.note) {
      application.note = sanitizeString(body.note);
    }

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

// ==================== 路由配置和主处理函数 ====================

const routes = {
  'GET /api/health': handleHealth,
  'POST /api/submit-form': handleSubmitForm,
  'POST /api/admin/login': handleAdminLogin,
  'GET /api/admin/system-config': handleGetSystemConfig,
  'PUT /api/admin/system-config': handleUpdateSystemConfig,
  'GET /api/admin/applications': handleGetApplications,
  'PATCH /api/admin/applications/:id/status': handleUpdateApplicationStatus,
};

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

export default {
  async fetch(request, env, ctx) {
    try {
      // 处理 CORS 预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
          }
        });
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
      return response;

    } catch (error) {
      console.error('Worker 错误:', error);
      return createResponse({
        success: false,
        message: '服务器内部错误'
      }, 500);
    }
  }
};
