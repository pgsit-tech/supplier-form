/**
 * 工具函数库
 * 包含加密、JWT、响应处理等通用功能
 */

// ==================== 响应处理 ====================

export function createResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

export function handleCORS(origin, allowedOrigins) {
  // 支持多个前端域名的 CORS 预检
  const origins = allowedOrigins ? allowedOrigins.split(',').map(url => url.trim()) : ['*'];

  let allowOrigin = '*';
  if (origin && origins.length > 0 && !origins.includes('*')) {
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

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'true',
    }
  });
}

// ==================== ID 生成 ====================

export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

// ==================== 密码处理 ====================

// 简化的密码哈希（生产环境建议使用更强的算法）
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'pgs_salt_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password, hash) {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}

// ==================== JWT 处理 ====================

// JWT Header
const JWT_HEADER = {
  alg: 'HS256',
  typ: 'JWT'
};

// Base64URL 编码
function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Base64URL 解码
function base64UrlDecode(str) {
  str += '='.repeat((4 - str.length % 4) % 4);
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

// 生成 JWT
export async function generateJWT(payload, secret) {
  try {
    // 添加标准声明
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + (24 * 60 * 60), // 24小时过期
      iss: 'pgs-supplier-system'
    };
    
    // 编码 header 和 payload
    const encodedHeader = base64UrlEncode(JSON.stringify(JWT_HEADER));
    const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
    
    // 创建签名
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = await createHMACSignature(data, secret);
    
    return `${data}.${signature}`;
    
  } catch (error) {
    console.error('JWT 生成错误:', error);
    return null;
  }
}

// 验证 JWT
export async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [encodedHeader, encodedPayload, signature] = parts;
    
    // 验证签名
    const data = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await createHMACSignature(data, secret);
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // 解码 payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // 检查过期时间
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

// 创建 HMAC 签名
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

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone) {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

// ==================== 日期处理 ====================

export function formatDate(date) {
  return new Date(date).toISOString();
}

export function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// ==================== 错误处理 ====================

export class APIError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'APIError';
  }
}

export function handleError(error) {
  if (error instanceof APIError) {
    return createResponse({
      success: false,
      message: error.message,
      code: error.code
    }, error.status);
  }
  
  console.error('未处理的错误:', error);
  return createResponse({
    success: false,
    message: '服务器内部错误'
  }, 500);
}

// ==================== 数据转换 ====================

export function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function stringifyJSON(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return null;
  }
}

// ==================== 分页处理 ====================

export function parsePagination(url) {
  const searchParams = new URL(url).searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  
  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

export function createPaginationResponse(items, total, pagination) {
  const totalPages = Math.ceil(total / pagination.limit);
  
  return {
    items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1
    }
  };
}

// ==================== 缓存处理 ====================

export function createCacheKey(...parts) {
  return parts.filter(Boolean).join(':');
}

export function getCacheHeaders(maxAge = 300) {
  return {
    'Cache-Control': `public, max-age=${maxAge}`,
    'ETag': generateId()
  };
}

// ==================== 安全处理 ====================

export function sanitizeInput(input) {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>\"']/g, '');
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}

export function validateOrigin(origin, allowedOrigins) {
  if (!origin) return false;
  return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
}

// ==================== 日志处理 ====================

export function logRequest(request, startTime) {
  const duration = Date.now() - startTime;
  const url = new URL(request.url);
  
  console.log(JSON.stringify({
    method: request.method,
    path: url.pathname,
    query: url.search,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('User-Agent'),
    ip: request.headers.get('CF-Connecting-IP')
  }));
}

export function logError(error, context = {}) {
  console.error(JSON.stringify({
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context,
    timestamp: new Date().toISOString()
  }));
}