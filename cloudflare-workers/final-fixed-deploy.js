/**
 * Cloudflare Workers - 供应商申请系统后端 API
 * 最终修复版本：解决CORS问题和环境变量配置
 * 
 * 环境变量绑定:
 * - SUPPLIER_APPLICATIONS: KV 命名空间
 * - ADMIN_USERS: KV 命名空间  
 * - ADMIN_SESSIONS: KV 命名空间
 * - SYSTEM_CONFIG: KV 命名空间
 * - JWT_SECRET: JWT 密钥
 * - FRONTEND_URL: 前端域名（用于 CORS）
 */

// ==================== 响应处理 ====================

function createResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

function handleCORS(origin, allowedOrigins) {
  console.log('CORS Debug - Origin:', origin);
  console.log('CORS Debug - AllowedOrigins:', allowedOrigins);
  
  // 支持多个前端域名的 CORS 预检
  const origins = allowedOrigins ? allowedOrigins.split(',').map(url => url.trim()) : ['*'];
  console.log('CORS Debug - Parsed Origins:', origins);

  let allowOrigin = '*';
  
  // 如果没有配置FRONTEND_URL，默认允许所有来源
  if (!allowedOrigins) {
    allowOrigin = '*';
  } else if (origin && origins.length > 0 && !origins.includes('*')) {
    if (origins.includes(origin)) {
      allowOrigin = origin;
    } else {
      // 检查是否有匹配的域名
      const matchedOrigin = origins.find(allowedOrigin => {
        if (allowedOrigin.startsWith('https://') && origin.startsWith('https://')) {
          const allowedDomain = allowedOrigin.replace('https://', '');
          const requestDomain = origin.replace('https://', '');
          return requestDomain === allowedDomain || requestDomain.endsWith('.' + allowedDomain);
        }
        return false;
      });
      if (matchedOrigin) {
        allowOrigin = origin;
      }
    }
  } else if (origins.length === 1 && origins[0] !== '*') {
    allowOrigin = origins[0];
  }

  console.log('CORS Debug - Final AllowOrigin:', allowOrigin);

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };

  console.log('CORS Debug - Headers:', corsHeaders);

  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// ==================== ID 生成 ====================

function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

// ==================== 密码处理 ====================

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

// ==================== JWT 处理 ====================

const JWT_HEADER = {
  alg: 'HS256',
  typ: 'JWT'
};

function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str) {
  str += '='.repeat((4 - str.length % 4) % 4);
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

async function generateJWT(payload, secret) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + (24 * 60 * 60),
      iss: 'pgs-supplier-system'
    };
    
    const encodedHeader = base64UrlEncode(JSON.stringify(JWT_HEADER));
    const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
    
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = await createHMACSignature(data, secret);
    
    return `${data}.${signature}`;
  } catch (error) {
    console.error('JWT 生成错误:', error);
    return null;
  }
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [encodedHeader, encodedPayload, signature] = parts;
    
    const data = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await createHMACSignature(data, secret);
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('JWT 验证错误:', error);
    return null;
  }
}

async function createHMACSignature(data, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  return base64UrlEncode(String.fromCharCode(...signatureArray));
}

// ==================== 数据验证 ====================

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

function createValidationResult(success, data = null, errors = []) {
  return { success, data, errors };
}

function createError(field, message) {
  return { field, message };
}

// ==================== 供应商表单验证 ====================

function validateSupplierForm(data) {
  const errors = [];
  const validatedData = {};
  
  // 申请人邮箱
  if (!data.applicantEmail || typeof data.applicantEmail !== 'string') {
    errors.push(createError('applicantEmail', '申请人邮箱是必填项'));
  } else if (!isValidEmail(data.applicantEmail)) {
    errors.push(createError('applicantEmail', '请输入有效的邮箱地址'));
  } else {
    validatedData.applicantEmail = sanitizeString(data.applicantEmail);
  }
  
  // 申请人分支
  if (!data.applicantBranch || typeof data.applicantBranch !== 'string') {
    errors.push(createError('applicantBranch', '申请人分支是必填项'));
  } else {
    const validBranches = ['SHA', 'BJS', 'CAN', 'SZX', 'NGB', 'XMN', 'QD', 'TJ'];
    if (!validBranches.includes(data.applicantBranch)) {
      errors.push(createError('applicantBranch', '请选择有效的分支'));
    } else {
      validatedData.applicantBranch = data.applicantBranch;
    }
  }
  
  // 供应商名称
  if (!data.supplierName || typeof data.supplierName !== 'string') {
    errors.push(createError('supplierName', '供应商名称是必填项'));
  } else if (data.supplierName.trim().length < 2) {
    errors.push(createError('supplierName', '供应商名称至少需要2个字符'));
  } else {
    validatedData.supplierName = sanitizeString(data.supplierName);
  }
  
  // 供应商地址
  if (!data.supplierAddress || typeof data.supplierAddress !== 'string') {
    errors.push(createError('supplierAddress', '供应商地址是必填项'));
  } else if (data.supplierAddress.trim().length < 5) {
    errors.push(createError('supplierAddress', '供应商地址至少需要5个字符'));
  } else {
    validatedData.supplierAddress = sanitizeString(data.supplierAddress);
  }
  
  // 联系人及职务（可选）
  if (data.contactPersonAndTitle && typeof data.contactPersonAndTitle === 'string') {
    if (data.contactPersonAndTitle.trim().length < 2) {
      errors.push(createError('contactPersonAndTitle', '联系人及职务至少需要2个字符'));
    } else {
      validatedData.contactPersonAndTitle = sanitizeString(data.contactPersonAndTitle);
    }
  } else {
    validatedData.contactPersonAndTitle = '';
  }

  // 联系电话（可选）
  if (data.contactPhone && typeof data.contactPhone === 'string') {
    if (!isValidPhone(data.contactPhone)) {
      errors.push(createError('contactPhone', '请输入有效的电话号码'));
    } else {
      validatedData.contactPhone = sanitizeString(data.contactPhone);
    }
  } else {
    validatedData.contactPhone = '';
  }

  // 联系邮箱（可选）
  if (data.contactEmail && typeof data.contactEmail === 'string') {
    if (data.contactEmail.trim() !== '' && !isValidEmail(data.contactEmail)) {
      errors.push(createError('contactEmail', '请输入有效的邮箱地址'));
    } else {
      validatedData.contactEmail = sanitizeString(data.contactEmail);
    }
  } else {
    validatedData.contactEmail = '';
  }
  
  // 是否签署协议
  if (!data.agreementSigned || typeof data.agreementSigned !== 'string') {
    errors.push(createError('agreementSigned', '请选择是否签署协议'));
  } else {
    const validValues = ['yes', 'no'];
    if (!validValues.includes(data.agreementSigned)) {
      errors.push(createError('agreementSigned', '请选择有效的协议签署状态'));
    } else {
      validatedData.agreementSigned = data.agreementSigned;
    }
  }
  
  // 主营业务
  if (!Array.isArray(data.mainBusiness) || data.mainBusiness.length === 0) {
    errors.push(createError('mainBusiness', '请至少选择一项主营业务'));
  } else {
    const validBusiness = ['agent', 'booking', 'warehouse', 'transport', 'customs', 'other'];
    const invalidBusiness = data.mainBusiness.filter(b => !validBusiness.includes(b));
    if (invalidBusiness.length > 0) {
      errors.push(createError('mainBusiness', '包含无效的主营业务选项'));
    } else {
      validatedData.mainBusiness = data.mainBusiness;
    }
  }
  
  // 使用原因
  if (!data.usageReason || typeof data.usageReason !== 'string') {
    errors.push(createError('usageReason', '使用原因是必填项'));
  } else if (data.usageReason.trim().length < 10) {
    errors.push(createError('usageReason', '使用原因至少需要10个字符'));
  } else {
    validatedData.usageReason = sanitizeString(data.usageReason);
  }
  
  // 供应商来源
  if (!data.supplierSource || typeof data.supplierSource !== 'string') {
    errors.push(createError('supplierSource', '供应商来源是必填项'));
  } else if (data.supplierSource.trim().length < 5) {
    errors.push(createError('supplierSource', '供应商来源至少需要5个字符'));
  } else {
    validatedData.supplierSource = sanitizeString(data.supplierSource);
  }
  
  // FM3000代码（可选）
  if (data.fm3000Code && typeof data.fm3000Code === 'string') {
    validatedData.fm3000Code = sanitizeString(data.fm3000Code);
  }
  
  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }
  
  return createValidationResult(true, validatedData);
}

// ==================== 其他验证函数 ====================

function validateLogin(data) {
  const errors = [];
  const validatedData = {};

  if (!data.username || typeof data.username !== 'string') {
    errors.push(createError('username', '用户名是必填项'));
  } else if (data.username.trim().length < 3) {
    errors.push(createError('username', '用户名至少需要3个字符'));
  } else {
    validatedData.username = sanitizeString(data.username);
  }

  if (!data.password || typeof data.password !== 'string') {
    errors.push(createError('password', '密码是必填项'));
  } else if (data.password.length < 6) {
    errors.push(createError('password', '密码至少需要6个字符'));
  } else {
    validatedData.password = data.password;
  }

  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }

  return createValidationResult(true, validatedData);
}

function validateStatusUpdate(data) {
  const errors = [];
  const validatedData = {};

  if (!data.status || typeof data.status !== 'string') {
    errors.push(createError('status', '状态是必填项'));
  } else {
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(data.status)) {
      errors.push(createError('status', '请选择有效的状态'));
    } else {
      validatedData.status = data.status;
    }
  }

  if (data.note && typeof data.note === 'string') {
    validatedData.note = sanitizeString(data.note);
  }

  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }

  return createValidationResult(true, validatedData);
}

function validateSystemConfig(data) {
  const errors = [];
  const validatedData = {};

  if (!data.title || typeof data.title !== 'string') {
    errors.push(createError('title', '系统标题是必填项'));
  } else if (data.title.trim().length < 2) {
    errors.push(createError('title', '系统标题至少需要2个字符'));
  } else if (data.title.trim().length > 50) {
    errors.push(createError('title', '系统标题不能超过50个字符'));
  } else {
    validatedData.title = sanitizeString(data.title);
  }

  if (!data.subtitle || typeof data.subtitle !== 'string') {
    errors.push(createError('subtitle', '系统副标题是必填项'));
  } else if (data.subtitle.trim().length < 2) {
    errors.push(createError('subtitle', '系统副标题至少需要2个字符'));
  } else if (data.subtitle.trim().length > 30) {
    errors.push(createError('subtitle', '系统副标题不能超过30个字符'));
  } else {
    validatedData.subtitle = sanitizeString(data.subtitle);
  }

  if (!data.description || typeof data.description !== 'string') {
    errors.push(createError('description', '系统描述是必填项'));
  } else if (data.description.trim().length < 10) {
    errors.push(createError('description', '系统描述至少需要10个字符'));
  } else if (data.description.trim().length > 200) {
    errors.push(createError('description', '系统描述不能超过200个字符'));
  } else {
    validatedData.description = sanitizeString(data.description);
  }

  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }

  return createValidationResult(true, validatedData);
}

// ==================== 路由配置 ====================

const routes = {
  'POST /api/submit-form': handleSubmitForm,
  'POST /api/admin/login': handleAdminLogin,
  'GET /api/admin/system-config': handleGetSystemConfig,
  'PUT /api/admin/system-config': handleUpdateSystemConfig,
  'GET /api/admin/applications': handleGetApplications,
  'PATCH /api/admin/applications/:id/status': handleUpdateApplicationStatus,
  'GET /api/health': handleHealth,
};

function matchRoute(routePath, actualPath) {
  const routeParts = routePath.split('/');
  const actualParts = actualPath.split('/');

  if (routeParts.length !== actualParts.length) {
    return false;
  }

  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      continue;
    }
    if (routeParts[i] !== actualParts[i]) {
      return false;
    }
  }

  return true;
}

function addCORSHeaders(response, frontendUrl, requestOrigin) {
  console.log('addCORSHeaders - FrontendUrl:', frontendUrl);
  console.log('addCORSHeaders - RequestOrigin:', requestOrigin);

  const allowedOrigins = frontendUrl ? frontendUrl.split(',').map(url => url.trim()) : ['*'];

  let allowOrigin = '*';
  if (!frontendUrl) {
    allowOrigin = '*';
  } else if (requestOrigin && allowedOrigins.length > 0 && !allowedOrigins.includes('*')) {
    if (allowedOrigins.includes(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else {
      const matchedOrigin = allowedOrigins.find(origin => {
        if (origin.startsWith('https://') && requestOrigin.startsWith('https://')) {
          const originDomain = origin.replace('https://', '');
          const requestDomain = requestOrigin.replace('https://', '');
          return requestDomain === originDomain || requestDomain.endsWith('.' + originDomain);
        }
        return false;
      });
      if (matchedOrigin) {
        allowOrigin = requestOrigin;
      }
    }
  } else if (allowedOrigins.length === 1 && allowedOrigins[0] !== '*') {
    allowOrigin = allowedOrigins[0];
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };

  console.log('addCORSHeaders - Final Headers:', corsHeaders);

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

// ==================== 主处理函数 ====================

export default {
  async fetch(request, env, ctx) {
    try {
      console.log('Worker Request:', request.method, request.url);
      console.log('Environment Variables:', {
        FRONTEND_URL: env.FRONTEND_URL,
        hasSupplierApplications: !!env.SUPPLIER_APPLICATIONS,
        hasAdminUsers: !!env.ADMIN_USERS,
        hasAdminSessions: !!env.ADMIN_SESSIONS,
        hasSystemConfig: !!env.SYSTEM_CONFIG,
        hasJwtSecret: !!env.JWT_SECRET
      });

      // 处理 CORS 预检请求
      if (request.method === 'OPTIONS') {
        const origin = request.headers.get('Origin');
        console.log('OPTIONS Request - Origin:', origin);
        return handleCORS(origin, env.FRONTEND_URL);
      }

      const url = new URL(request.url);
      const method = request.method;
      const path = url.pathname;

      console.log('Route Matching:', method, path);

      // 路由匹配
      const routeKey = `${method} ${path}`;
      let handler = routes[routeKey];

      // 处理动态路由
      if (!handler) {
        for (const [route, routeHandler] of Object.entries(routes)) {
          const [routeMethod, routePath] = route.split(' ');
          if (routeMethod === method && matchRoute(routePath, path)) {
            handler = routeHandler;
            console.log('Matched Dynamic Route:', route);
            break;
          }
        }
      } else {
        console.log('Matched Static Route:', routeKey);
      }

      if (!handler) {
        console.log('No Route Handler Found');
        return createResponse({
          success: false,
          message: 'API 端点不存在'
        }, 404);
      }

      // 执行处理器
      const response = await handler(request, env, ctx);

      // 添加 CORS 头
      const requestOrigin = request.headers.get('Origin');
      return addCORSHeaders(response, env.FRONTEND_URL, requestOrigin);

    } catch (error) {
      console.error('Worker 错误:', error);
      return createResponse({
        success: false,
        message: '服务器内部错误'
      }, 500);
    }
  }
};

// ==================== API 处理器函数 ====================

async function handleHealth(request, env) {
  return createResponse({
    success: true,
    message: '服务正常运行',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: {
      hasFrontendUrl: !!env.FRONTEND_URL,
      frontendUrl: env.FRONTEND_URL
    }
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

    await env.SUPPLIER_APPLICATIONS.put(
      `application:${applicationId}`,
      JSON.stringify(applicationData)
    );

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

    const userKey = `user:${username}`;
    const userData = await env.ADMIN_USERS.get(userKey);

    if (!userData) {
      return createResponse({
        success: false,
        message: '用户名或密码错误'
      }, 401);
    }

    const user = JSON.parse(userData);

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return createResponse({
        success: false,
        message: '用户名或密码错误'
      }, 401);
    }

    if (!user.isActive) {
      return createResponse({
        success: false,
        message: '账户已被禁用'
      }, 401);
    }

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

    await env.ADMIN_SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      { expirationTtl: 24 * 60 * 60 }
    );

    user.lastLoginAt = now;
    await env.ADMIN_USERS.put(userKey, JSON.stringify(user));

    const token = await generateJWT({
      sessionId,
      userId: user.id,
      username: user.username,
      role: user.role
    }, env.JWT_SECRET);

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

    const sessionData = await env.ADMIN_SESSIONS.get(`session:${payload.sessionId}`);
    if (!sessionData) {
      return { success: false, message: '会话已过期' };
    }

    const session = JSON.parse(sessionData);

    if (new Date(session.expiresAt) < new Date()) {
      return { success: false, message: '会话已过期' };
    }

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

    let applicationIds = [];

    if (status && status !== 'all') {
      const statusIds = await env.SUPPLIER_APPLICATIONS.get(`applications:by_status:${status}`);
      applicationIds = statusIds ? JSON.parse(statusIds) : [];
    } else {
      const allIds = await env.SUPPLIER_APPLICATIONS.get('applications:list');
      applicationIds = allIds ? JSON.parse(allIds) : [];
    }

    const applications = [];
    for (const id of applicationIds) {
      const appData = await env.SUPPLIER_APPLICATIONS.get(`application:${id}`);
      if (appData) {
        const app = JSON.parse(appData);

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

    applications.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedApplications = applications.slice(startIndex, endIndex);

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

    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const applicationId = pathParts[4];

    const body = await request.json();

    const validation = validateStatusUpdate(body);
    if (!validation.success) {
      return createResponse({
        success: false,
        message: '请求数据格式错误',
        errors: validation.errors
      }, 400);
    }

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

    application.status = newStatus;
    application.updatedAt = new Date().toISOString();
    application.updatedBy = authResult.user.username;

    await env.SUPPLIER_APPLICATIONS.put(
      `application:${applicationId}`,
      JSON.stringify(application)
    );

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
    const listKey = 'applications:list';
    let allIds = await env.SUPPLIER_APPLICATIONS.get(listKey);
    allIds = allIds ? JSON.parse(allIds) : [];

    if (operation === 'create') {
      allIds.unshift(application.id);
    }

    await env.SUPPLIER_APPLICATIONS.put(listKey, JSON.stringify(allIds));

    const statusKey = `applications:by_status:${application.status}`;
    let statusIds = await env.SUPPLIER_APPLICATIONS.get(statusKey);
    statusIds = statusIds ? JSON.parse(statusIds) : [];

    if (operation === 'create') {
      statusIds.unshift(application.id);
    } else if (operation === 'update' && oldStatus !== application.status) {
      if (oldStatus) {
        const oldStatusKey = `applications:by_status:${oldStatus}`;
        let oldStatusIds = await env.SUPPLIER_APPLICATIONS.get(oldStatusKey);
        oldStatusIds = oldStatusIds ? JSON.parse(oldStatusIds) : [];
        oldStatusIds = oldStatusIds.filter(id => id !== application.id);
        await env.SUPPLIER_APPLICATIONS.put(oldStatusKey, JSON.stringify(oldStatusIds));
      }

      if (!statusIds.includes(application.id)) {
        statusIds.unshift(application.id);
      }
    }

    await env.SUPPLIER_APPLICATIONS.put(statusKey, JSON.stringify(statusIds));

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
