/**
 * API 配置文件
 * 用于配置后端 API 的基础 URL 和相关设置
 */

// API 基础配置
export const API_CONFIG = {
  // 根据环境自动选择 API 基础 URL
  BASE_URL: process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_API_URL || 'https://supplier-api.pgs-log.cn'
    : 'http://localhost:3000',
  
  // 请求超时时间（毫秒）
  TIMEOUT: 10000,
  
  // 重试配置
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// API 端点定义
export const API_ENDPOINTS = {
  // 健康检查
  HEALTH: '/api/health',
  
  // 供应商申请
  SUBMIT_FORM: '/api/submit-form',
  
  // 管理员认证
  ADMIN_LOGIN: '/api/admin/login',
  ADMIN_LOGOUT: '/api/admin/logout',
  
  // 申请管理
  APPLICATIONS: '/api/admin/applications',
  APPLICATION_STATUS: (id: string) => `/api/admin/applications/${id}/status`,
  APPLICATION_DETAIL: (id: string) => `/api/admin/applications/${id}`,
};

// 请求头配置
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// 认证相关配置
export const AUTH_CONFIG = {
  TOKEN_KEY: 'pgs_admin_token',
  USER_KEY: 'pgs_admin_user',
  TOKEN_EXPIRY_BUFFER: 5 * 60 * 1000, // 5分钟缓冲时间
};

/**
 * 构建完整的 API URL
 */
export function buildApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

/**
 * 获取认证头
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }
  
  const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
  if (!token) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * 通用 API 请求函数
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(endpoint);
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...getAuthHeaders(),
      ...options.headers,
    },
  };
  
  // 添加超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
  config.signal = controller.signal;
  
  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData.code
      );
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof APIError) {
      throw error;
    }
    
    if (error.name === 'AbortError') {
      throw new APIError('请求超时', 408, 'TIMEOUT');
    }
    
    throw new APIError('网络错误', 0, 'NETWORK_ERROR');
  }
}

/**
 * API 错误类
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status: number = 0,
    public code: string = 'UNKNOWN_ERROR'
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * 重试机制的 API 请求
 */
export async function apiRequestWithRetry<T = any>(
  endpoint: string,
  options: RequestInit = {},
  maxRetries: number = API_CONFIG.RETRY_ATTEMPTS
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiRequest<T>(endpoint, options);
    } catch (error) {
      lastError = error as Error;
      
      // 不重试的错误类型
      if (error instanceof APIError) {
        if (error.status >= 400 && error.status < 500) {
          throw error; // 客户端错误不重试
        }
      }
      
      // 最后一次尝试失败
      if (attempt === maxRetries) {
        break;
      }
      
      // 等待后重试
      await new Promise(resolve => 
        setTimeout(resolve, API_CONFIG.RETRY_DELAY * (attempt + 1))
      );
    }
  }
  
  throw lastError!;
}

/**
 * 检查 API 健康状态
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await apiRequest(API_ENDPOINTS.HEALTH);
    return response.success === true;
  } catch {
    return false;
  }
}

/**
 * 存储认证信息
 */
export function storeAuthData(token: string, user: any): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
  localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
}

/**
 * 清除认证信息
 */
export function clearAuthData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
  localStorage.removeItem(AUTH_CONFIG.USER_KEY);
}

/**
 * 获取存储的用户信息
 */
export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem(AUTH_CONFIG.USER_KEY);
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
  return !!token;
}