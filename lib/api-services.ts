/**
 * API 服务函数
 * 封装所有后端 API 调用
 */

import { 
  apiRequest, 
  apiRequestWithRetry, 
  API_ENDPOINTS, 
  storeAuthData, 
  clearAuthData 
} from './api-config';

// ==================== 类型定义 ====================

export interface SupplierFormData {
  applicantEmail: string;
  applicantBranch: string;
  supplierName: string;
  supplierAddress: string;
  contactPersonAndTitle: string;
  contactPhone: string;
  contactEmail: string;
  agreementSigned: 'yes' | 'no';
  mainBusiness: string[];
  usageReason: string;
  supplierSource: string;
  fm3000Code?: string;
  establishDate?: string;
  registeredCapital?: string;
  legalRepresentative?: string;
  registrationLocation?: string;
  companyType?: 'limited' | 'partnership' | 'sole' | 'foreign' | 'other';
  isTaxpayer?: 'yes' | 'no';
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface Application {
  id: string;
  applicantEmail: string;
  applicantBranch: string;
  supplierName: string;
  supplierAddress: string;
  contactPersonAndTitle: string;
  contactPhone: string;
  contactEmail: string;
  agreementSigned: 'yes' | 'no';
  mainBusiness: string[];
  usageReason: string;
  supplierSource: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  updatedAt: string;
  updatedBy?: string;
  fm3000Code?: string;
  establishDate?: string;
  registeredCapital?: string;
  legalRepresentative?: string;
  registrationLocation?: string;
  companyType?: string;
  isTaxpayer?: string;
}

export interface ApplicationsResponse {
  success: boolean;
  applications: Application[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface StatusUpdateData {
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  token?: string;
  user?: User;
  errors?: Array<{ field: string; message: string }>;
}

// ==================== 供应商申请相关 ====================

/**
 * 提交供应商申请表单
 */
export async function submitSupplierForm(formData: SupplierFormData): Promise<ApiResponse> {
  return apiRequestWithRetry(API_ENDPOINTS.SUBMIT_FORM, {
    method: 'POST',
    body: JSON.stringify(formData),
  });
}

// ==================== 管理员认证相关 ====================

/**
 * 管理员登录
 */
export async function adminLogin(credentials: LoginCredentials): Promise<ApiResponse<User>> {
  const response = await apiRequest<ApiResponse<User>>(API_ENDPOINTS.ADMIN_LOGIN, {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  
  // 登录成功后存储认证信息
  if (response.success && response.token && response.user) {
    storeAuthData(response.token, response.user);
  }
  
  return response;
}

/**
 * 管理员登出
 */
export async function adminLogout(): Promise<void> {
  // 清除本地存储的认证信息
  clearAuthData();
  
  // 如果后端有登出端点，可以调用
  // try {
  //   await apiRequest(API_ENDPOINTS.ADMIN_LOGOUT, { method: 'POST' });
  // } catch {
  //   // 忽略登出请求失败
  // }
}

// ==================== 申请管理相关 ====================

/**
 * 获取申请列表
 */
export async function getApplications(params: {
  page?: number;
  limit?: number;
  status?: 'all' | 'pending' | 'approved' | 'rejected';
  search?: string;
} = {}): Promise<ApplicationsResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.status) searchParams.set('status', params.status);
  if (params.search) searchParams.set('search', params.search);
  
  const endpoint = `${API_ENDPOINTS.APPLICATIONS}?${searchParams.toString()}`;
  
  return apiRequest<ApplicationsResponse>(endpoint);
}

/**
 * 获取单个申请详情
 */
export async function getApplicationDetail(id: string): Promise<ApiResponse<Application>> {
  return apiRequest<ApiResponse<Application>>(API_ENDPOINTS.APPLICATION_DETAIL(id));
}

/**
 * 更新申请状态
 */
export async function updateApplicationStatus(
  id: string, 
  statusData: StatusUpdateData
): Promise<ApiResponse> {
  return apiRequest<ApiResponse>(API_ENDPOINTS.APPLICATION_STATUS(id), {
    method: 'PATCH',
    body: JSON.stringify(statusData),
  });
}

// ==================== 系统相关 ====================

/**
 * 检查 API 健康状态
 */
export async function checkHealth(): Promise<ApiResponse> {
  return apiRequest<ApiResponse>(API_ENDPOINTS.HEALTH);
}

// ==================== 错误处理工具 ====================

/**
 * 处理 API 错误响应
 */
export function handleApiError(error: any): string {
  if (error?.message) {
    return error.message;
  }
  
  if (error?.errors && Array.isArray(error.errors)) {
    return error.errors.map((e: any) => e.message).join(', ');
  }
  
  return '操作失败，请稍后重试';
}

/**
 * 检查是否为认证错误
 */
export function isAuthError(error: any): boolean {
  return error?.status === 401 || error?.code === 'UNAUTHORIZED';
}

/**
 * 处理认证错误
 */
export function handleAuthError(): void {
  clearAuthData();
  // 可以在这里添加重定向到登录页面的逻辑
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/login';
  }
}

// ==================== 数据转换工具 ====================

/**
 * 格式化申请状态显示文本
 */
export function formatApplicationStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
  };
  
  return statusMap[status] || status;
}

/**
 * 格式化申请分支显示文本
 */
export function formatBranch(branch: string): string {
  const branchMap: Record<string, string> = {
    SHA: '上海',
    BJS: '北京',
    CAN: '广州',
    SZX: '深圳',
    NGB: '宁波',
    XMN: '厦门',
    QD: '青岛',
    TJ: '天津',
  };
  
  return branchMap[branch] || branch;
}

/**
 * 格式化主营业务显示文本
 */
export function formatMainBusiness(business: string[]): string {
  const businessMap: Record<string, string> = {
    agent: '货运代理',
    booking: '订舱服务',
    warehouse: '仓储服务',
    transport: '运输服务',
    customs: '报关服务',
    other: '其他服务',
  };
  
  return business.map(b => businessMap[b] || b).join('、');
}

/**
 * 格式化日期显示
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}天前`;
    } else if (diffHours > 0) {
      return `${diffHours}小时前`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}分钟前`;
    } else {
      return '刚刚';
    }
  } catch {
    return dateString;
  }
}

// ==================== 数据验证工具 ====================

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证电话号码格式
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * 验证必填字段
 */
export function validateRequired(value: any): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== null && value !== undefined;
}