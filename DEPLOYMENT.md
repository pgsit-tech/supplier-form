# 📚 Cloudflare 部署完整手册

## 🎯 部署架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare 部署架构                        │
├─────────────────────────────────────────────────────────────┤
│  前端 (Cloudflare Pages)                                    │
│  ├── 静态网站托管                                            │
│  ├── 自动 GitHub 集成                                       │
│  └── 全球 CDN 加速                                          │
│                                                             │
│  后端 API (Cloudflare Workers)                              │
│  ├── 无服务器函数                                            │
│  ├── GitHub Actions 部署                                    │
│  └── 边缘计算                                               │
│                                                             │
│  数据存储 (Cloudflare KV/D1)                                │
│  ├── KV: 键值存储                                           │
│  └── D1: SQL 数据库                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 准备工作

### 1. 账户准备
- [x] Cloudflare 账户（免费版即可）
- [x] GitHub 账户
- [x] 项目代码已推送到 GitHub

### 2. 本地环境准备
```bash
# 安装 Cloudflare CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

---

## 🚀 第一部分：前端部署 (Cloudflare Pages)

### 步骤 1：准备项目代码

#### 1.1 确保 next.config.js 配置正确
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 生产环境使用静态导出
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true
    },
    // 禁用服务端功能
    experimental: {
      missingSuspenseWithCSRBailout: false,
    }
  })
};

module.exports = nextConfig;
```

#### 1.2 修改 package.json 添加构建脚本
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:static": "NODE_ENV=production next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### 步骤 2：在 Cloudflare Pages 创建项目

#### 2.1 登录 Cloudflare Dashboard
1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 登录您的账户

#### 2.2 创建 Pages 项目
1. 点击左侧菜单 **"Pages"**
2. 点击 **"Create a project"**
3. 选择 **"Connect to Git"**

#### 2.3 连接 GitHub 仓库
1. 选择 **"GitHub"**
2. 授权 Cloudflare 访问您的 GitHub
3. 选择 `supplier-form-system` 仓库
4. 点击 **"Begin setup"**

#### 2.4 配置构建设置
```yaml
项目名称: supplier-form-system
生产分支: main
构建命令: npm run build:static
构建输出目录: out
根目录: /
Node.js 版本: 18
```

**详细配置：**
- **Framework preset**: Next.js (Static HTML Export)
- **Build command**: `npm run build:static`
- **Build output directory**: `out`
- **Root directory**: `/` (保持默认)

#### 2.5 环境变量设置
在 **"Environment variables"** 部分添加：
```
NODE_ENV = production
NEXT_PUBLIC_API_URL = https://your-workers-domain.your-subdomain.workers.dev
```

#### 2.6 部署
1. 点击 **"Save and Deploy"**
2. 等待构建完成（通常需要 2-5 分钟）

---

## ⚡ 第二部分：后端 API 部署 (Cloudflare Workers)

### 步骤 1：创建 Workers 项目结构

#### 1.1 在项目根目录创建 `workers` 文件夹
```bash
mkdir workers
cd workers
```

#### 1.2 初始化 Workers 项目
```bash
npm init -y
npm install @cloudflare/workers-types --save-dev
```

#### 1.3 创建 `wrangler.toml` 配置文件
```toml
name = "supplier-form-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
name = "supplier-form-api"
kv_namespaces = [
  { binding = "SUPPLIER_DATA", id = "your-kv-namespace-id" }
]

[[env.production.d1_databases]]
binding = "DB"
database_name = "supplier-form-db"
database_id = "your-d1-database-id"
```

### 步骤 2：创建 KV 存储

#### 2.1 创建 KV Namespace
```bash
# 创建生产环境的 KV namespace
wrangler kv:namespace create "SUPPLIER_DATA" --env production

# 记录返回的 namespace ID
```

#### 2.2 更新 wrangler.toml
将返回的 namespace ID 更新到 `wrangler.toml` 文件中：
```toml
[env.production]
kv_namespaces = [
  { binding = "SUPPLIER_DATA", id = "your-actual-kv-namespace-id" }
]
```

### 步骤 3：创建 D1 数据库（可选）

#### 3.1 创建 D1 数据库
```bash
wrangler d1 create supplier-form-db
```

#### 3.2 创建数据表
创建 `schema.sql` 文件：
```sql
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  applicant_email TEXT NOT NULL,
  applicant_branch TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_address TEXT NOT NULL,
  contact_person_and_title TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  agreement_signed TEXT NOT NULL,
  main_business TEXT NOT NULL,
  usage_reason TEXT NOT NULL,
  supplier_source TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  submitted_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE INDEX idx_status ON applications(status);
CREATE INDEX idx_submitted_at ON applications(submitted_at);
```

#### 3.3 执行数据库迁移
```bash
wrangler d1 execute supplier-form-db --file=schema.sql --env production
```

### 步骤 4：部署 Workers

#### 4.1 部署到 Cloudflare Workers
```bash
# 部署到生产环境
wrangler deploy --env production
```

#### 4.2 获取 Workers URL
部署成功后，记录返回的 Workers URL，格式类似：
```
https://supplier-form-api.your-subdomain.workers.dev
```

---

## 🔧 第三部分：GitHub Actions 自动部署

### 步骤 1：创建 GitHub Actions 工作流

#### 1.1 创建 Pages 部署工作流 `.github/workflows/deploy-pages.yml`
```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build static site
      run: npm run build:static
      env:
        NODE_ENV: production
        
    - name: Deploy to Cloudflare Pages
      uses: cloudflare/pages-action@v1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        projectName: supplier-form-system
        directory: out
        gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

#### 1.2 创建 Workers 部署工作流 `.github/workflows/deploy-workers.yml`
```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [ main ]
    paths: [ 'workers/**' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: 'workers/package-lock.json'
        
    - name: Install dependencies
      run: |
        cd workers
        npm ci
        
    - name: Deploy to Cloudflare Workers
      uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        workingDirectory: 'workers'
        command: deploy --env production
```

### 步骤 2：配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

1. 进入 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 添加以下 secrets：

```
CLOUDFLARE_API_TOKEN = your-cloudflare-api-token
CLOUDFLARE_ACCOUNT_ID = your-cloudflare-account-id
```

#### 获取 Cloudflare API Token：
1. 访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 **"Create Token"**
3. 使用 **"Custom token"** 模板
4. 设置权限：
   - **Zone:Zone:Read**
   - **Zone:Page Rules:Edit**
   - **Account:Cloudflare Pages:Edit**
   - **Account:Account Settings:Read**

---

## 🔍 第四部分：测试和验证

### 1. 本地测试
```bash
# 测试静态构建
npm run build:static

# 测试 Workers（在 workers 目录）
cd workers
wrangler dev
```

### 2. 部署后测试

#### 2.1 前端测试
- 访问 Cloudflare Pages 提供的 URL
- 测试表单提交功能
- 测试管理端登录功能

#### 2.2 API 测试
```bash
# 测试表单提交 API
curl -X POST https://your-workers-domain.workers.dev/api/submit-form \
  -H "Content-Type: application/json" \
  -d '{"applicantEmail":"test@example.com","supplierName":"Test Company"}'

# 测试管理员登录 API
curl -X POST https://your-workers-domain.workers.dev/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 🛠️ 第五部分：常见问题和解决方案

### 1. 构建失败
**问题**: Next.js 构建失败
**解决方案**: 
- 检查 `next.config.js` 配置
- 确保所有依赖都已安装
- 检查代码中是否有服务端特性

### 2. API 跨域问题
**问题**: 前端无法访问 Workers API
**解决方案**: 
- 确保 Workers 中正确设置了 CORS 头
- 检查 API URL 配置

### 3. KV 存储问题
**问题**: 数据无法保存到 KV
**解决方案**: 
- 检查 KV namespace 绑定
- 确认 wrangler.toml 配置正确

### 4. 环境变量问题
**问题**: 环境变量未生效
**解决方案**: 
- 检查 Cloudflare Pages 环境变量设置
- 确认变量名称正确（NEXT_PUBLIC_ 前缀）

---

## 📝 第六部分：维护和更新

### 1. 代码更新流程
1. 本地开发和测试
2. 提交代码到 GitHub
3. GitHub Actions 自动部署
4. 验证部署结果

### 2. 数据备份
```bash
# 备份 KV 数据
wrangler kv:key list --binding SUPPLIER_DATA --env production

# 备份 D1 数据
wrangler d1 export supplier-form-db --env production
```

### 3. 监控和日志
- 使用 Cloudflare Analytics 监控访问情况
- 查看 Workers 日志排查问题
- 设置告警通知

---

## 🎉 部署完成检查清单

- [ ] Cloudflare Pages 项目创建并配置
- [ ] GitHub 仓库连接成功
- [ ] 构建配置正确
- [ ] 环境变量设置完成
- [ ] Workers 项目创建
- [ ] KV 存储配置
- [ ] D1 数据库创建（可选）
- [ ] GitHub Actions 工作流配置
- [ ] API 测试通过
- [ ] 前端功能测试通过
- [ ] 管理端功能测试通过

---

## 📞 支持和帮助

如果在部署过程中遇到问题，可以参考：
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Next.js 静态导出文档](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

---

**部署完成后，您将拥有一个完全托管在 Cloudflare 上的现代化供应商管理系统！** 🚀