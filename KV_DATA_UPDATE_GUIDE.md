# 🔧 KV 数据更新指南

## 📋 当前状态检查

根据您的截图，我发现以下问题需要修正：

### ❌ 问题 1: 管理员密码哈希不匹配
- **当前 KV 中的哈希**: `a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3`
- **Worker 期望的哈希**: `43fa4a393b6f4d046d4010740b4078a50e04197c6c08d8fa5575493bcd127c45`
- **原因**: KV 中的哈希与 Worker 代码的哈希算法不匹配

### ❌ 问题 2: 环境变量需要更新
- **当前**: 只支持单个前端域名
- **需要**: 支持多个前端域名

## 🔧 修正步骤

### 第一步：更新管理员账户数据

在 Cloudflare Dashboard → KV → admin-users 中：

#### 1. 更新 `user:admin` 键的值
```json
{
  "id": "admin_001",
  "username": "admin",
  "passwordHash": "43fa4a393b6f4d046d4010740b4078a50e04197c6c08d8fa5575493bcd127c45",
  "name": "PGS系统管理员",
  "role": "admin",
  "email": "admin@pgs.com",
  "createdAt": "2025-06-11T04:29:26.072Z",
  "isActive": true
}
```

#### 2. 添加 `user:pgs-admin` 键（如果不存在）
```json
{
  "id": "admin_002",
  "username": "pgs-admin",
  "passwordHash": "43fa4a393b6f4d046d4010740b4078a50e04197c6c08d8fa5575493bcd127c45",
  "name": "PGS备用管理员",
  "role": "admin",
  "email": "pgs-admin@pgs.com",
  "createdAt": "2025-06-11T04:29:26.074Z",
  "isActive": true
}
```

**新密码**: `hello123` （满足6个字符最低要求）

### 第二步：更新环境变量

在 Cloudflare Dashboard → Workers → supplier-form-api → 设置 → 变量和机密中：

#### 更新 `FRONTEND_URL` 变量
**当前值**: `https://supplier-form.pages.dev`
**新值**: `https://supplier-form.pages.dev,https://spcode.pgs-log.cn`

这样可以支持两个前端域名的 CORS 访问。

### 第三步：验证 KV 数据结构

确保 `supplier-applications` KV 中有以下键：

#### 统计数据键
- **键**: `applications:stats`
- **值**: `{"total":0,"pending":0,"approved":0,"rejected":0}`

#### 索引键
- **键**: `applications:list`
- **值**: `[]`

- **键**: `applications:by_status:pending`
- **值**: `[]`

- **键**: `applications:by_status:approved`
- **值**: `[]`

- **键**: `applications:by_status:rejected`
- **值**: `[]`

## 🧪 验证步骤

### 1. 测试管理员登录
完成上述更新后，使用以下凭据测试登录：
- **用户名**: `admin`
- **密码**: `hello123`

### 2. 测试 API 端点
- 健康检查: `GET /api/health`
- 管理员登录: `POST /api/admin/login`

### 3. 测试 CORS
确保前端可以从两个域名访问 API：
- `https://supplier-form.pages.dev`
- `https://spcode.pgs-log.cn`

## 📝 操作清单

- [ ] 更新 `admin-users` KV 中的 `user:admin` 数据
- [ ] 添加 `admin-users` KV 中的 `user:pgs-admin` 数据
- [ ] 更新 Worker 环境变量 `FRONTEND_URL`
- [ ] 验证 `supplier-applications` KV 中的索引数据
- [ ] 测试管理员登录功能
- [ ] 测试 CORS 配置

## 🔍 故障排除

### 如果登录仍然失败
1. 检查密码哈希是否完全匹配
2. 确认用户名拼写正确
3. 查看 Worker 日志中的错误信息

### 如果 CORS 错误
1. 确认 `FRONTEND_URL` 包含正确的域名
2. 检查域名格式（包含 https://）
3. 重新部署 Worker 代码

## 📞 技术支持

如果遇到问题，请提供：
1. 具体的错误信息
2. 浏览器控制台日志
3. Worker 日志截图
4. KV 数据截图