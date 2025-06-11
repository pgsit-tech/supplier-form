# 🚀 Cloudflare Workers 手动部署指南

## 📋 部署前准备

### 1. 创建 KV 命名空间

**访问路径：** Cloudflare Dashboard → Workers & Pages → KV

创建以下三个 KV 命名空间：

1. **SUPPLIER_APPLICATIONS**
   - 名称：`supplier-applications`
   - 用途：存储供应商申请数据

2. **ADMIN_USERS**
   - 名称：`admin-users`
   - 用途：存储管理员账户信息

3. **ADMIN_SESSIONS**
   - 名称：`admin-sessions`
   - 用途：存储登录会话数据

**记录命名空间 ID：** 创建后请记录每个命名空间的 ID，后续配置需要使用。

### 2. 初始化管理员账户

在 `ADMIN_USERS` 命名空间中手动添加初始管理员数据：

**键：** `user:admin`
**值：**
```json
{
  "id": "admin_001",
  "username": "admin",
  "passwordHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "name": "PGS管理员",
  "role": "admin",
  "email": "admin@pgs.com",
  "createdAt": "2025-06-11T10:00:00Z",
  "isActive": true
}
```

**注意：** 上述密码哈希对应的明文密码是空字符串，首次登录后请立即修改密码。

## 🔧 Workers 部署步骤

### 步骤 1：创建 Worker

1. **访问 Workers 控制台**
   - 登录 Cloudflare Dashboard
   - 点击 "Workers & Pages"
   - 点击 "Create application"
   - 选择 "Create Worker"

2. **配置 Worker**
   - Worker 名称：`supplier-form-api`
   - 点击 "Deploy" 创建基础 Worker

### 步骤 2：上传代码

1. **进入 Worker 编辑器**
   - 点击刚创建的 Worker
   - 点击 "Quick edit" 按钮

2. **替换代码**
   - 删除默认代码
   - 复制 `worker.js` 的完整内容
   - 粘贴到编辑器中

3. **添加工具文件**
   - 点击编辑器左侧的 "+" 按钮
   - 创建 `utils.js` 文件，复制对应内容
   - 创建 `validators.js` 文件，复制对应内容

4. **保存并部署**
   - 点击 "Save and deploy"

### 步骤 3：配置环境变量

1. **访问 Worker 设置**
   - 在 Worker 详情页面，点击 "Settings" 标签
   - 点击 "Variables" 部分

2. **添加环境变量**
   ```
   FRONTEND_URL = https://supplier-form.pages.dev
   JWT_SECRET = your-super-secret-jwt-key-change-this-now
   ```

3. **保存配置**
   - 点击 "Save and deploy"

### 步骤 4：绑定 KV 命名空间

1. **访问 KV 绑定设置**
   - 在 Worker 设置页面，找到 "KV Namespace Bindings"
   - 点击 "Add binding"

2. **添加三个绑定**

   **绑定 1：**
   - Variable name: `SUPPLIER_APPLICATIONS`
   - KV namespace: 选择之前创建的 `supplier-applications`

   **绑定 2：**
   - Variable name: `ADMIN_USERS`
   - KV namespace: 选择之前创建的 `admin-users`

   **绑定 3：**
   - Variable name: `ADMIN_SESSIONS`
   - KV namespace: 选择之前创建的 `admin-sessions`

3. **保存配置**
   - 点击 "Save and deploy"

### 步骤 5：配置自定义域名（可选）

1. **添加路由**
   - 在 Worker 设置页面，找到 "Triggers" 部分
   - 点击 "Add route"

2. **配置路由**
   - Route: `api.your-domain.com/*`
   - Zone: 选择您的域名

3. **或使用 workers.dev 域名**
   - 默认域名：`supplier-form-api.your-account.workers.dev`
   - 可以直接使用，无需额外配置

## 🧪 测试部署

### 1. 健康检查

访问：`https://your-worker-domain.workers.dev/api/health`

预期响应：
```json
{
  "success": true,
  "message": "服务正常运行",
  "timestamp": "2025-06-11T10:30:00.000Z",
  "version": "1.0.0"
}
```

### 2. 管理员登录测试

**请求：**
```bash
curl -X POST https://your-worker-domain.workers.dev/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": ""
  }'
```

**预期响应：**
```json
{
  "success": true,
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin_001",
    "username": "admin",
    "name": "PGS管理员",
    "role": "admin",
    "email": "admin@pgs.com"
  }
}
```

### 3. 申请提交测试

**请求：**
```bash
curl -X POST https://your-worker-domain.workers.dev/api/submit-form \
  -H "Content-Type: application/json" \
  -d '{
    "applicantEmail": "test@pgs.com",
    "applicantBranch": "SHA",
    "supplierName": "测试供应商",
    "supplierAddress": "测试地址123号",
    "contactPersonAndTitle": "张三 - 经理",
    "contactPhone": "021-12345678",
    "contactEmail": "contact@test.com",
    "agreementSigned": "yes",
    "mainBusiness": ["agent", "booking"],
    "usageReason": "测试使用原因，需要至少10个字符",
    "supplierSource": "测试来源信息"
  }'
```

## 🔄 更新前端配置

### 1. 更新 API 基础 URL

在前端项目中，需要更新 API 调用的基础 URL：

**创建环境配置文件：**
```javascript
// lib/config.ts
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://your-worker-domain.workers.dev'
    : 'http://localhost:3000',
  TIMEOUT: 10000
};
```

### 2. 更新 API 调用

**示例更新：**
```javascript
// 原来的调用
const response = await fetch('/api/submit-form', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});

// 更新后的调用
import { API_CONFIG } from '@/lib/config';

const response = await fetch(`${API_CONFIG.BASE_URL}/api/submit-form`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});
```

### 3. 处理 CORS

Workers 已经配置了 CORS 支持，前端无需额外配置。

## 🔒 安全配置

### 1. 更新 JWT 密钥

**重要：** 请立即更新 `JWT_SECRET` 环境变量为强密码：

```
JWT_SECRET = your-super-secure-random-string-at-least-32-characters-long
```

### 2. 限制前端域名

更新 `FRONTEND_URL` 环境变量为您的实际前端域名：

```
FRONTEND_URL = https://supplier-form.pages.dev
```

### 3. 设置强密码

首次登录后，请立即修改管理员密码为强密码。

## 📊 监控和日志

### 1. 查看 Worker 日志

- 在 Worker 详情页面，点击 "Logs" 标签
- 实时查看请求日志和错误信息

### 2. 监控指标

- 在 Worker 详情页面，点击 "Metrics" 标签
- 查看请求量、错误率、响应时间等指标

### 3. 设置告警

- 在 Cloudflare Dashboard 中配置告警规则
- 监控 Worker 的可用性和性能

## 🔧 故障排除

### 常见问题

1. **KV 绑定错误**
   - 检查 KV 命名空间是否正确绑定
   - 确认变量名称拼写正确

2. **CORS 错误**
   - 检查 `FRONTEND_URL` 环境变量
   - 确认前端域名配置正确

3. **认证失败**
   - 检查 `JWT_SECRET` 环境变量
   - 确认管理员账户数据格式正确

4. **数据存储失败**
   - 检查 KV 命名空间权限
   - 确认数据格式符合要求

### 调试技巧

1. **查看详细日志**
   ```javascript
   console.log('Debug info:', { request: request.url, data: requestData });
   ```

2. **测试 KV 连接**
   ```javascript
   const testData = await env.SUPPLIER_APPLICATIONS.get('test-key');
   console.log('KV test:', testData);
   ```

3. **验证环境变量**
   ```javascript
   console.log('Environment:', {
     frontendUrl: env.FRONTEND_URL,
     hasJwtSecret: !!env.JWT_SECRET
   });
   ```

## 📚 API 文档

部署完成后，您的 API 将提供以下端点：

- `GET /api/health` - 健康检查
- `POST /api/submit-form` - 提交供应商申请
- `POST /api/admin/login` - 管理员登录
- `GET /api/admin/applications` - 获取申请列表
- `PATCH /api/admin/applications/:id/status` - 更新申请状态

详细的 API 文档请参考代码中的注释和验证器定义。