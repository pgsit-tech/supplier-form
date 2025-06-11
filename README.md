# 🏢 供应商系统CODE申请备案表

一个基于 Next.js 构建的现代化供应商申请管理系统，支持表单提交、管理员审核和状态管理。

## ✨ 功能特性

### 📝 用户端功能
- **智能表单验证**：实时验证用户输入，提供友好的错误提示
- **响应式设计**：完美适配桌面和移动设备
- **现代化UI**：使用 Tailwind CSS 构建的美观界面
- **多步骤表单**：清晰的信息分组和填写流程

### 👨‍💼 管理端功能
- **安全登录系统**：管理员身份验证和权限控制
- **申请管理仪表板**：统计概览和申请列表
- **状态管理**：一键审核通过/拒绝申请
- **搜索和筛选**：快速查找特定申请
- **实时数据更新**：状态变更即时反映

## 🛠️ 技术栈

### 前端
- **Next.js 14** - React 全栈框架
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 实用优先的 CSS 框架
- **React Hook Form** - 高性能表单库
- **Zod** - TypeScript 优先的数据验证
- **Lucide React** - 现代图标库

### 后端
- **Next.js API Routes** - 服务端 API
- **Cloudflare Workers** - 边缘计算平台
- **Cloudflare KV** - 键值存储
- **Cloudflare D1** - SQL 数据库（可选）

### 部署
- **Cloudflare Pages** - 静态网站托管
- **GitHub Actions** - 自动化部署
- **Git** - 版本控制

## 🚀 快速开始

### 环境要求
- Node.js 18+ 
- npm 或 yarn
- Git

### 本地开发

1. **克隆仓库**
```bash
git clone https://github.com/your-username/supplier-form-system.git
cd supplier-form-system
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **访问应用**
- 主表单：http://localhost:3000
- 管理端：http://localhost:3000/admin/login

### 管理员账户
- 用户名：`admin`
- 密码：`123456`

## 📁 项目结构

```
supplier-form-system/
├── app/                           # Next.js App Router
│   ├── admin/                     # 管理端页面
│   │   ├── dashboard/page.tsx     # 管理仪表板
│   │   └── login/page.tsx         # 管理员登录
│   ├── api/                       # API路由
│   │   ├── admin/                 # 管理端API
│   │   │   ├── applications/      # 申请管理API
│   │   │   └── login/route.ts     # 登录API
│   │   └── submit-form/route.ts   # 表单提交API
│   ├── globals.css                # 全局样式
│   ├── layout.tsx                 # 根布局
│   └── page.tsx                   # 主表单页面
├── lib/                           # 工具库
│   └── validations.ts             # 表单验证模式
├── .github/workflows/             # GitHub Actions
├── public/                        # 静态资源
├── DEPLOYMENT.md                  # 部署文档
├── next.config.js                 # Next.js配置
└── package.json                   # 项目依赖
```

## 🔧 配置说明

### 环境变量
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-workers-domain.workers.dev
```

### 构建命令
```bash
# 开发环境
npm run dev

# 生产构建
npm run build

# 静态导出（用于 Cloudflare Pages）
npm run build:static
```

## 📋 表单字段

### 申请人信息
- 申请人邮箱（必填）
- 申请人所属分公司（必填）

### 供应商基本信息
- 供应商名称（必填）
- FM3000 Code（可选）
- 供应商公司地址（必填）
- 企业创立日期（可选）
- 注册资本（可选）
- 法人代表（可选）
- 注册地（可选）
- 企业性质（可选）
- 是否为一般纳税人（可选）

### 业务信息
- 主营业务类型（必填，多选）
- 联系人及职务（必填）
- 联系电话（必填）
- 联系人邮箱（必填）
- 是否已签署协议（必填）

### 补充信息
- 使用此供应商理由（必填）
- 如何得知此供应商（必填）

## 🌐 部署指南

详细的部署说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 快速部署到 Cloudflare

1. **前端部署（Cloudflare Pages）**
   - 连接 GitHub 仓库
   - 设置构建命令：`npm run build:static`
   - 设置输出目录：`out`

2. **后端部署（Cloudflare Workers）**
   - 创建 Workers 项目
   - 配置 KV 存储
   - 使用 GitHub Actions 自动部署

## 🧪 测试

### 表单测试
1. 填写完整的供应商信息
2. 验证必填字段检查
3. 测试表单提交功能

### 管理端测试
1. 使用管理员账户登录
2. 查看申请列表和统计
3. 测试申请审核功能

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 支持

如果您在使用过程中遇到问题，请：

1. 查看 [部署文档](./DEPLOYMENT.md)
2. 检查 [Issues](https://github.com/your-username/supplier-form-system/issues)
3. 创建新的 Issue 描述问题

---

**由 PGS-IT 团队开发维护** 🚀