/**
 * 数据验证器
 * 基于原有的 Zod 验证逻辑，转换为原生 JavaScript 实现
 */

import { isValidEmail, isValidPhone, sanitizeString } from './utils.js';

// ==================== 验证结果类型 ====================

function createValidationResult(success, data = null, errors = []) {
  return { success, data, errors };
}

function createError(field, message) {
  return { field, message };
}

// ==================== 供应商表单验证 ====================

export function validateSupplierForm(data) {
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

// ==================== 管理员登录验证 ====================

export function validateLogin(data) {
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
    validatedData.password = data.password; // 密码不进行 sanitize
  }
  
  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }
  
  return createValidationResult(true, validatedData);
}

// ==================== 状态更新验证 ====================

export function validateStatusUpdate(data) {
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

// ==================== 用户创建验证 ====================

export function validateUserCreate(data) {
  const errors = [];
  const validatedData = {};
  
  // 用户名
  if (!data.username || typeof data.username !== 'string') {
    errors.push(createError('username', '用户名是必填项'));
  } else if (data.username.trim().length < 3) {
    errors.push(createError('username', '用户名至少需要3个字符'));
  } else if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
    errors.push(createError('username', '用户名只能包含字母、数字、下划线和连字符'));
  } else {
    validatedData.username = sanitizeString(data.username);
  }
  
  // 密码
  if (!data.password || typeof data.password !== 'string') {
    errors.push(createError('password', '密码是必填项'));
  } else if (data.password.length < 8) {
    errors.push(createError('password', '密码至少需要8个字符'));
  } else {
    validatedData.password = data.password;
  }
  
  // 姓名
  if (!data.name || typeof data.name !== 'string') {
    errors.push(createError('name', '姓名是必填项'));
  } else if (data.name.trim().length < 2) {
    errors.push(createError('name', '姓名至少需要2个字符'));
  } else {
    validatedData.name = sanitizeString(data.name);
  }
  
  // 邮箱
  if (!data.email || typeof data.email !== 'string') {
    errors.push(createError('email', '邮箱是必填项'));
  } else if (!isValidEmail(data.email)) {
    errors.push(createError('email', '请输入有效的邮箱地址'));
  } else {
    validatedData.email = sanitizeString(data.email);
  }
  
  // 角色
  if (!data.role || typeof data.role !== 'string') {
    errors.push(createError('role', '角色是必填项'));
  } else {
    const validRoles = ['admin', 'user'];
    if (!validRoles.includes(data.role)) {
      errors.push(createError('role', '请选择有效的角色'));
    } else {
      validatedData.role = data.role;
    }
  }
  
  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }
  
  return createValidationResult(true, validatedData);
}

// ==================== 查询参数验证 ====================

export function validateQueryParams(searchParams) {
  const validatedParams = {};
  
  // 页码
  const page = searchParams.get('page');
  if (page) {
    const pageNum = parseInt(page);
    if (!isNaN(pageNum) && pageNum > 0) {
      validatedParams.page = pageNum;
    }
  }
  
  // 每页数量
  const limit = searchParams.get('limit');
  if (limit) {
    const limitNum = parseInt(limit);
    if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
      validatedParams.limit = limitNum;
    }
  }
  
  // 状态过滤
  const status = searchParams.get('status');
  if (status) {
    const validStatuses = ['all', 'pending', 'approved', 'rejected'];
    if (validStatuses.includes(status)) {
      validatedParams.status = status;
    }
  }
  
  // 搜索关键词
  const search = searchParams.get('search');
  if (search && typeof search === 'string') {
    validatedParams.search = sanitizeString(search);
  }
  
  // 排序字段
  const sortBy = searchParams.get('sortBy');
  if (sortBy) {
    const validSortFields = ['submittedAt', 'updatedAt', 'supplierName', 'status'];
    if (validSortFields.includes(sortBy)) {
      validatedParams.sortBy = sortBy;
    }
  }
  
  // 排序方向
  const sortOrder = searchParams.get('sortOrder');
  if (sortOrder) {
    const validOrders = ['asc', 'desc'];
    if (validOrders.includes(sortOrder)) {
      validatedParams.sortOrder = sortOrder;
    }
  }
  
  return validatedParams;
}

// ==================== 通用验证函数 ====================

export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return createError(fieldName, `${fieldName}是必填项`);
  }
  return null;
}

export function validateString(value, fieldName, minLength = 0, maxLength = Infinity) {
  if (typeof value !== 'string') {
    return createError(fieldName, `${fieldName}必须是字符串`);
  }
  
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return createError(fieldName, `${fieldName}至少需要${minLength}个字符`);
  }
  
  if (trimmed.length > maxLength) {
    return createError(fieldName, `${fieldName}不能超过${maxLength}个字符`);
  }
  
  return null;
}

export function validateNumber(value, fieldName, min = -Infinity, max = Infinity) {
  const num = Number(value);
  if (isNaN(num)) {
    return createError(fieldName, `${fieldName}必须是有效数字`);
  }
  
  if (num < min) {
    return createError(fieldName, `${fieldName}不能小于${min}`);
  }
  
  if (num > max) {
    return createError(fieldName, `${fieldName}不能大于${max}`);
  }
  
  return null;
}

export function validateArray(value, fieldName, minLength = 0, maxLength = Infinity) {
  if (!Array.isArray(value)) {
    return createError(fieldName, `${fieldName}必须是数组`);
  }
  
  if (value.length < minLength) {
    return createError(fieldName, `${fieldName}至少需要${minLength}个元素`);
  }
  
  if (value.length > maxLength) {
    return createError(fieldName, `${fieldName}不能超过${maxLength}个元素`);
  }
  
  return null;
}

export function validateEnum(value, fieldName, validValues) {
  if (!validValues.includes(value)) {
    return createError(fieldName, `${fieldName}必须是以下值之一: ${validValues.join(', ')}`);
  }
  
  return null;
}