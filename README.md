# 供应商系统CODE申请备案表

## 项目概述

这是一个基于 Next.js 15 的现代化供应商申请表单系统，完全根据 PGS 内部实际表单需求开发。

## 功能特性

### ✅ 完整的表单字段
- **申请人信息**：邮箱、所属分公司
- **供应商基本信息**：名称、FM3000 Code、地址
- **企业详细信息**：创立日期、注册资本、法人代表、注册地、企业性质、纳税人状态
- **联系信息**：联系人及职务、电话、邮箱
- **协议状态**：是否已签署协议
- **主营业务**：多选业务类型（一代、订舱、船東、拖車、倉庫、報關、拼箱、買單報關、其他）
- **补充信息**：使用理由、信息来源

### ✅ 技术特性
- **现代化UI**：基于 Tailwind CSS 的响应式设计
- **表单验证**：使用 Zod + React Hook Form 进行严格验证
- **图标系统**：集成 Lucide React 图标
- **API集成**：完整的前后端数据交互
- **TypeScript**：完全类型安全的开发体验

### ✅ 用户体验
- **直观的界面**：清晰的分组和视觉层次
- **实时验证**：即时的错误提示和反馈
- **响应式设计**：支持桌面和移动设备
- **加载状态**：提交过程中的视觉反馈
- **成功页面**：提交成功后的确认界面

## 技术栈

- **框架**: Next.js 15.3.3
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **表单**: React Hook Form + Zod
- **图标**: Lucide React
- **开发工具**: ESLint

## 项目结构

```
supplier-form-new/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── submit-form/
│   │   │       └── route.ts          # API路由
│   │   ├── globals.css               # 全局样式
│   │   ├── layout.tsx                # 布局组件
│   │   └── page.tsx                  # 主页面组件
│   └── lib/
│       └── validations.ts            # 表单验证模式
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 安装和运行

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 访问应用
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 表单字段说明

### 必填字段 (*)
1. **申请人邮箱** - 有效的邮箱地址
2. **申请人所属分公司** - 从预定义列表选择
3. **供应商名称** - 至少2个字符
4. **供应商公司地址** - 至少5个字符的完整地址
5. **联系人及职务** - 联系人姓名和职务
6. **联系电话** - 有效的联系电话
7. **联系人邮箱** - 有效的邮箱地址
8. **是否已签署协议** - 选择是或否
9. **主营业务** - 至少选择一项业务类型
10. **使用此供应商理由** - 至少10个字符的详细说明
11. **如何得知此供应商** - 至少10个字符的详细信息

### 可选字段
- FM3000 Code
- 企业创立日期
- 注册资本
- 法人代表
- 注册地
- 企业性质
- 是否为一般纳税人

## 分公司代码

- BJS - 北京
- CAN - 广州
- CGO - 郑州
- NGB - 宁波
- QDO - 青岛
- SHA - 上海
- SZX - 深圳
- TSN - 天津
- XMN - 厦门

## 主营业务类型

- 一代 - 一级代理
- 订舱 - 订舱服务
- 船東 - 船东服务
- 拖車 - 拖车运输
- 倉庫 - 仓储服务
- 報關 - 报关服务
- 拼箱 - 拼箱服务
- 買單報關 - 买单报关
- 其他 - 其他服务

## API 接口

### POST /api/submit-form
提交供应商申请表单

**请求体**:
```json
{
  "applicantEmail": "string",
  "applicantBranch": "string",
  "supplierName": "string",
  "supplierAddress": "string",
  "contactPersonAndTitle": "string",
  "contactPhone": "string",
  "contactEmail": "string",
  "agreementSigned": "string",
  "mainBusiness": ["string"],
  "usageReason": "string",
  "supplierSource": "string",
  // ... 其他可选字段
}
```

**响应**:
```json
{
  "success": true,
  "message": "申请提交成功",
  "data": { /* 提交的数据 */ }
}
```

## 开发说明

### 添加新字段
1. 在 `src/lib/validations.ts` 中更新 `supplierFormSchema`
2. 在 `src/app/page.tsx` 中添加对应的表单控件
3. 更新 TypeScript 类型定义

### 自定义样式
- 主要样式在 `src/app/globals.css`
- 组件样式使用 Tailwind CSS 类名
- 可以在 `tailwind.config.ts` 中自定义主题

### 部署
项目可以部署到任何支持 Next.js 的平台：
- Vercel (推荐)
- Netlify
- Cloudflare Pages
- 自托管服务器

## 许可证

MIT License

## 更新日志

### v1.0.0 (2025-06-10)
- ✅ 初始版本发布
- ✅ 完整的表单功能
- ✅ 响应式设计
- ✅ 表单验证
- ✅ API集成
- ✅ 成功页面