/**
 * Cloudflare Workers - 供应商申请系统后端 API
 * 完整的单文件部署版本，包含所有必需的函数和路由
 * 
 * 环境变量绑定:
 * - SUPPLIER_APPLICATIONS: KV 命名空间
 * - ADMIN_USERS: KV 命名空间  
 * - ADMIN_SESSIONS: KV 命名空间
 * - SYSTEM_CONFIG: KV 命名空间
 * - NOTIFICATION_CONFIG: KV 命名空间
 * - JWT_SECRET: JWT 密钥
 * - FRONTEND_URL: 前端域名（用于 CORS）
 */

// ==================== 工具函数 ====================

// 邮箱验证
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 电话号码验证
function isValidPhone(phone) {
  const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// 字符串清理
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

// 创建响应
function createResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// 生成唯一ID
function generateId(prefix = 'id') {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${randomStr}`;
}

// 密码哈希
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 密码验证
async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// JWT生成
async function generateJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  const message = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${message}.${encodedSignature}`;
}

// JWT验证
async function verifyJWT(token, secret) {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    const message = `${encodedHeader}.${encodedPayload}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signature = Uint8Array.from(atob(encodedSignature), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(message));
    
    if (isValid) {
      return JSON.parse(atob(encodedPayload));
    }
    return null;
  } catch (error) {
    return null;
  }
}

// CORS处理
function handleCORS(origin, allowedOrigins) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// 添加CORS头
function addCORSHeaders(response, frontendUrl, requestOrigin) {
  const allowedOrigins = frontendUrl ? frontendUrl.split(',').map(url => url.trim()) : ['*'];
  
  let allowOrigin = '*';
  if (requestOrigin && allowedOrigins.length > 0 && !allowedOrigins.includes('*')) {
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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers),
      ...corsHeaders
    }
  });
}

// ==================== 验证函数 ====================

// 验证结果创建
function createValidationResult(success, data = null, errors = []) {
  return { success, data, errors };
}

// 错误创建
function createError(field, message) {
  return { field, message };
}

// 供应商表单验证
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
  
  // 成立日期（可选）
  if (data.establishDate && typeof data.establishDate === 'string') {
    const date = new Date(data.establishDate);
    if (isNaN(date.getTime())) {
      errors.push(createError('establishDate', '请输入有效的成立日期'));
    } else {
      validatedData.establishDate = data.establishDate;
    }
  }
  
  // 注册资本（可选）
  if (data.registeredCapital && typeof data.registeredCapital === 'string') {
    validatedData.registeredCapital = sanitizeString(data.registeredCapital);
  }
  
  // 法定代表人（可选）
  if (data.legalRepresentative && typeof data.legalRepresentative === 'string') {
    validatedData.legalRepresentative = sanitizeString(data.legalRepresentative);
  }
  
  // 注册地（可选）
  if (data.registrationLocation && typeof data.registrationLocation === 'string') {
    validatedData.registrationLocation = sanitizeString(data.registrationLocation);
  }
  
  // 公司类型（可选）
  if (data.companyType && typeof data.companyType === 'string') {
    const validTypes = ['limited', 'partnership', 'sole', 'foreign', 'other'];
    if (!validTypes.includes(data.companyType)) {
      errors.push(createError('companyType', '请选择有效的公司类型'));
    } else {
      validatedData.companyType = data.companyType;
    }
  }
  
  // 是否一般纳税人（可选）
  if (data.isTaxpayer && typeof data.isTaxpayer === 'string') {
    const validValues = ['yes', 'no'];
    if (!validValues.includes(data.isTaxpayer)) {
      errors.push(createError('isTaxpayer', '请选择有效的纳税人状态'));
    } else {
      validatedData.isTaxpayer = data.isTaxpayer;
    }
  }
  
  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }
  
  return createValidationResult(true, validatedData);
}

// 管理员登录验证
function validateLogin(data) {
  const errors = [];
  const validatedData = {};

  // 用户名
  if (!data.username || typeof data.username !== 'string') {
    errors.push(createError('username', '用户名是必填项'));
  } else if (data.username.trim().length < 3) {
    errors.push(createError('username', '用户名至少需要3个字符'));
  } else {
    validatedData.username = sanitizeString(data.username);
  }

  // 密码
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

// 状态更新验证
function validateStatusUpdate(data) {
  const errors = [];
  const validatedData = {};

  // 状态
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

  // 备注（可选）
  if (data.note && typeof data.note === 'string') {
    validatedData.note = sanitizeString(data.note);
  }

  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }

  return createValidationResult(true, validatedData);
}

// 系统配置验证
function validateSystemConfig(data) {
  const errors = [];
  const validatedData = {};

  // 系统标题
  if (!data.title || typeof data.title !== 'string') {
    errors.push(createError('title', '系统标题是必填项'));
  } else if (data.title.trim().length < 2) {
    errors.push(createError('title', '系统标题至少需要2个字符'));
  } else if (data.title.trim().length > 50) {
    errors.push(createError('title', '系统标题不能超过50个字符'));
  } else {
    validatedData.title = sanitizeString(data.title);
  }

  // 系统副标题
  if (!data.subtitle || typeof data.subtitle !== 'string') {
    errors.push(createError('subtitle', '系统副标题是必填项'));
  } else if (data.subtitle.trim().length < 2) {
    errors.push(createError('subtitle', '系统副标题至少需要2个字符'));
  } else if (data.subtitle.trim().length > 30) {
    errors.push(createError('subtitle', '系统副标题不能超过30个字符'));
  } else {
    validatedData.subtitle = sanitizeString(data.subtitle);
  }

  // 系统描述
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

// 通知配置验证
function validateNotificationConfig(data) {
  const errors = [];
  const validatedData = {};

  // 企业微信启用状态
  if (typeof data.wechatEnabled !== 'boolean') {
    errors.push(createError('wechatEnabled', '企业微信启用状态必须是布尔值'));
  } else {
    validatedData.wechatEnabled = data.wechatEnabled;
  }

  // 企业微信Webhook URL
  if (data.wechatEnabled) {
    if (!data.wechatWebhookUrl || typeof data.wechatWebhookUrl !== 'string') {
      errors.push(createError('wechatWebhookUrl', '企业微信Webhook URL是必填项'));
    } else if (!data.wechatWebhookUrl.startsWith('https://qyapi.weixin.qq.com/')) {
      errors.push(createError('wechatWebhookUrl', '请输入有效的企业微信Webhook URL'));
    } else {
      validatedData.wechatWebhookUrl = sanitizeString(data.wechatWebhookUrl);
    }
  } else {
    validatedData.wechatWebhookUrl = data.wechatWebhookUrl || '';
  }

  // Webhook启用状态
  if (typeof data.webhookEnabled !== 'boolean') {
    errors.push(createError('webhookEnabled', 'Webhook启用状态必须是布尔值'));
  } else {
    validatedData.webhookEnabled = data.webhookEnabled;
  }

  // Webhook URL
  if (data.webhookEnabled) {
    if (!data.webhookUrl || typeof data.webhookUrl !== 'string') {
      errors.push(createError('webhookUrl', 'Webhook URL是必填项'));
    } else if (!data.webhookUrl.startsWith('http://') && !data.webhookUrl.startsWith('https://')) {
      errors.push(createError('webhookUrl', '请输入有效的Webhook URL'));
    } else {
      validatedData.webhookUrl = sanitizeString(data.webhookUrl);
    }
  } else {
    validatedData.webhookUrl = data.webhookUrl || '';
  }

  // 通知触发条件
  validatedData.notifyOnSubmit = typeof data.notifyOnSubmit === 'boolean' ? data.notifyOnSubmit : true;
  validatedData.notifyOnApprove = typeof data.notifyOnApprove === 'boolean' ? data.notifyOnApprove : true;
  validatedData.notifyOnReject = typeof data.notifyOnReject === 'boolean' ? data.notifyOnReject : true;

  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }

  return createValidationResult(true, validatedData);
}

// ==================== 路由配置 ====================

// 路由处理器
const routes = {
  // 供应商申请提交
  'POST /api/submit-form': handleSubmitForm,

  // 管理员登录
  'POST /api/admin/login': handleAdminLogin,

  // 管理员密码修改
  'POST /api/admin/change-password': handleChangePassword,

  // 系统配置管理
  'GET /api/admin/system-config': handleGetSystemConfig,
  'PUT /api/admin/system-config': handleUpdateSystemConfig,

  // 通知配置管理
  'GET /api/admin/notification-config': handleGetNotificationConfig,
  'PUT /api/admin/notification-config': handleUpdateNotificationConfig,
  'POST /api/admin/test-notification': handleTestNotification,

  // 获取申请列表
  'GET /api/admin/applications': handleGetApplications,

  // 更新申请状态
  'PATCH /api/admin/applications/:id/status': handleUpdateApplicationStatus,

  // 健康检查
  'GET /api/health': handleHealth,
};

// ==================== 主处理函数 ====================

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

// 主处理函数
export default {
  async fetch(request, env, ctx) {
    try {
      // 处理 CORS 预检请求
      if (request.method === 'OPTIONS') {
        const origin = request.headers.get('Origin');
        return handleCORS(origin, env.FRONTEND_URL);
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

// ==================== API处理函数 ====================

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

    // 发送新申请通知
    await sendStatusChangeNotification(env, applicationData, null);

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

    // 发送状态变更通知
    if (oldStatus !== newStatus) {
      await sendStatusChangeNotification(env, application, oldStatus);
    }

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

// 处理获取系统配置
async function handleGetSystemConfig(request, env) {
  try {
    // 验证管理员权限
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

// 处理更新系统配置
async function handleUpdateSystemConfig(request, env) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request, env);
    if (!authResult.success) {
      return createResponse({
        success: false,
        message: authResult.message
      }, 401);
    }

    const body = await request.json();

    // 验证配置数据
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

// 处理获取通知配置
async function handleGetNotificationConfig(request, env) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request, env);
    if (!authResult.success) {
      return createResponse({
        success: false,
        message: authResult.message
      }, 401);
    }

    // 获取通知配置
    const configData = await env.NOTIFICATION_CONFIG.get('notification_config');

    let config = {
      wechatEnabled: false,
      wechatWebhookUrl: '',
      webhookEnabled: false,
      webhookUrl: '',
      notifyOnSubmit: true,
      notifyOnApprove: true,
      notifyOnReject: true
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
    console.error('获取通知配置错误:', error);
    return createResponse({
      success: false,
      message: '获取通知配置失败'
    }, 500);
  }
}

// 处理更新通知配置
async function handleUpdateNotificationConfig(request, env) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request, env);
    if (!authResult.success) {
      return createResponse({
        success: false,
        message: authResult.message
      }, 401);
    }

    const body = await request.json();

    // 验证配置数据
    const validation = validateNotificationConfig(body);
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
    await env.NOTIFICATION_CONFIG.put('notification_config', JSON.stringify(config));

    return createResponse({
      success: true,
      message: '通知配置更新成功',
      config: config
    });

  } catch (error) {
    console.error('更新通知配置错误:', error);
    return createResponse({
      success: false,
      message: '更新通知配置失败，请稍后重试'
    }, 500);
  }
}

// 处理测试通知
async function handleTestNotification(request, env) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request, env);
    if (!authResult.success) {
      return createResponse({
        success: false,
        message: authResult.message
      }, 401);
    }

    const body = await request.json();
    const { type, config } = body;

    if (!type || !config) {
      return createResponse({
        success: false,
        message: '请求参数不完整'
      }, 400);
    }

    // 构建测试消息
    const testMessage = {
      type: 'test',
      application: {
        id: 'test_123',
        supplierName: '测试供应商公司',
        applicantEmail: 'test@example.com',
        status: 'pending',
        updatedAt: new Date().toISOString()
      },
      message: '这是一条测试通知消息'
    };

    let success = false;
    let errorMessage = '';

    if (type === 'wechat') {
      success = await sendWechatNotification(config.webhookUrl, testMessage);
      errorMessage = success ? '' : '企业微信通知发送失败，请检查Webhook URL是否正确';
    } else if (type === 'webhook') {
      success = await sendWebhookNotification(config.webhookUrl, testMessage);
      errorMessage = success ? '' : 'Webhook通知发送失败，请检查URL是否可访问';
    } else {
      return createResponse({
        success: false,
        message: '不支持的通知类型'
      }, 400);
    }

    return createResponse({
      success: success,
      message: success ? '测试通知发送成功' : errorMessage
    });

  } catch (error) {
    console.error('测试通知错误:', error);
    return createResponse({
      success: false,
      message: '测试通知失败，请稍后重试'
    }, 500);
  }
}

// 处理密码修改
async function handleChangePassword(request, env) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request, env);
    if (!authResult.success) {
      return createResponse({
        success: false,
        message: authResult.message
      }, 401);
    }

    const body = await request.json();

    // 验证密码数据
    if (!body.currentPassword || !body.newPassword) {
      return createResponse({
        success: false,
        message: '当前密码和新密码都是必填项'
      }, 400);
    }

    if (body.newPassword.length < 8) {
      return createResponse({
        success: false,
        message: '新密码至少需要8个字符'
      }, 400);
    }

    // 获取用户信息
    const userKey = `user:${authResult.user.username}`;
    const userData = await env.ADMIN_USERS.get(userKey);

    if (!userData) {
      return createResponse({
        success: false,
        message: '用户不存在'
      }, 404);
    }

    const user = JSON.parse(userData);

    // 验证当前密码
    const isValidCurrentPassword = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!isValidCurrentPassword) {
      return createResponse({
        success: false,
        message: '当前密码错误'
      }, 400);
    }

    // 生成新密码哈希
    const newPasswordHash = await hashPassword(body.newPassword);

    // 更新用户密码
    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date().toISOString();

    await env.ADMIN_USERS.put(userKey, JSON.stringify(user));

    return createResponse({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('密码修改错误:', error);
    return createResponse({
      success: false,
      message: '密码修改失败，请稍后重试'
    }, 500);
  }
}

// ==================== 通知发送函数 ====================

// 发送企业微信通知
async function sendWechatNotification(webhookUrl, data) {
  try {
    if (!webhookUrl) return false;

    const { application } = data;
    const statusText = {
      'pending': '待审核',
      'approved': '已批准',
      'rejected': '已拒绝'
    }[application.status] || application.status;

    const message = {
      msgtype: 'text',
      text: {
        content: `📋 供应商申请状态更新\n供应商：${application.supplierName}\n申请人：${application.applicantEmail}\n状态：${statusText}\n时间：${new Date(application.updatedAt).toLocaleString('zh-CN')}`
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    return response.ok;
  } catch (error) {
    console.error('企业微信通知发送失败:', error);
    return false;
  }
}

// 发送Webhook通知
async function sendWebhookNotification(webhookUrl, data) {
  try {
    if (!webhookUrl) return false;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    return response.ok;
  } catch (error) {
    console.error('Webhook通知发送失败:', error);
    return false;
  }
}

// 发送状态变更通知
async function sendStatusChangeNotification(env, application, oldStatus) {
  try {
    // 获取通知配置
    const configData = await env.NOTIFICATION_CONFIG.get('notification_config');
    if (!configData) return;

    const config = JSON.parse(configData);

    // 检查是否需要发送通知
    const shouldNotify =
      (application.status === 'pending' && config.notifyOnSubmit) ||
      (application.status === 'approved' && config.notifyOnApprove) ||
      (application.status === 'rejected' && config.notifyOnReject);

    if (!shouldNotify) return;

    const notificationData = {
      type: 'status_change',
      application: {
        id: application.id,
        supplierName: application.supplierName,
        applicantEmail: application.applicantEmail,
        status: application.status,
        oldStatus: oldStatus,
        updatedAt: application.updatedAt
      }
    };

    // 发送企业微信通知
    if (config.wechatEnabled && config.wechatWebhookUrl) {
      await sendWechatNotification(config.wechatWebhookUrl, notificationData);
    }

    // 发送Webhook通知
    if (config.webhookEnabled && config.webhookUrl) {
      await sendWebhookNotification(config.webhookUrl, notificationData);
    }

  } catch (error) {
    console.error('发送状态变更通知失败:', error);
  }
}

// ==================== 工具函数 ====================

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
