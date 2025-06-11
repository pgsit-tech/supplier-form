# 🔧 初始数据设置指南

## 📋 管理员账户初始化

### 1. 创建初始管理员账户

在 `ADMIN_USERS` KV 命名空间中添加以下数据：

#### 主管理员账户
**键：** `user:admin`
**值：**
```json
{
  "id": "admin_001",
  "username": "admin",
  "passwordHash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
  "name": "PGS系统管理员",
  "role": "admin",
  "email": "admin@pgs.com",
  "createdAt": "2025-06-11T10:00:00Z",
  "isActive": true
}
```
**默认密码：** `hello` （请首次登录后立即修改）

#### 备用管理员账户
**键：** `user:pgs-admin`
**值：**
```json
{
  "id": "admin_002",
  "username": "pgs-admin",
  "passwordHash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
  "name": "PGS备用管理员",
  "role": "admin",
  "email": "pgs-admin@pgs.com",
  "createdAt": "2025-06-11T10:00:00Z",
  "isActive": true
}
```
**默认密码：** `hello` （请首次登录后立即修改）

### 2. 初始化统计数据

在 `SUPPLIER_APPLICATIONS` KV 命名空间中添加以下初始统计数据：

**键：** `applications:stats`
**值：**
```json
{
  "total": 0,
  "pending": 0,
  "approved": 0,
  "rejected": 0
}
```

**键：** `applications:list`
**值：**
```json
[]
```

**键：** `applications:by_status:pending`
**值：**
```json
[]
```

**键：** `applications:by_status:approved`
**值：**
```json
[]
```

**键：** `applications:by_status:rejected`
**值：**
```json
[]
```

## 🧪 测试数据（可选）

### 测试申请数据

如果需要测试数据，可以在 `SUPPLIER_APPLICATIONS` KV 命名空间中添加：

**键：** `application:test_001`
**值：**
```json
{
  "id": "test_001",
  "applicantEmail": "test@pgs.com",
  "applicantBranch": "SHA",
  "supplierName": "测试物流有限公司",
  "supplierAddress": "上海市浦东新区测试路123号",
  "contactPersonAndTitle": "张三 - 业务经理",
  "contactPhone": "021-12345678",
  "contactEmail": "zhangsan@test.com",
  "agreementSigned": "yes",
  "mainBusiness": ["agent", "booking"],
  "usageReason": "测试供应商，用于验证系统功能正常运行",
  "supplierSource": "系统测试数据",
  "status": "pending",
  "submittedAt": "2025-06-11T10:30:00Z",
  "updatedAt": "2025-06-11T10:30:00Z",
  "fm3000Code": "FM2025001",
  "establishDate": "2020-01-01",
  "registeredCapital": "1000",
  "legalRepresentative": "张三",
  "registrationLocation": "上海市",
  "companyType": "limited",
  "isTaxpayer": "yes"
}
```

然后更新相应的索引：

**更新 `applications:list`：**
```json
["test_001"]
```

**更新 `applications:by_status:pending`：**
```json
["test_001"]
```

**更新 `applications:stats`：**
```json
{
  "total": 1,
  "pending": 1,
  "approved": 0,
  "rejected": 0
}
```

## 🔐 密码哈希生成

如果需要生成新的密码哈希，可以使用以下方法：

### 方法 1：在线工具
使用 SHA-256 在线哈希工具，输入密码加盐值：
- 输入：`your_password` + `pgs_salt_2025`
- 输出：SHA-256 哈希值

### 方法 2：Node.js 脚本
```javascript
const crypto = require('crypto');

function hashPassword(password) {
  const saltedPassword = password + 'pgs_salt_2025';
  return crypto.createHash('sha256').update(saltedPassword).digest('hex');
}

console.log(hashPassword('your_new_password'));
```

### 方法 3：浏览器控制台
```javascript
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'pgs_salt_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

hashPassword('your_new_password').then(console.log);
```

## 📝 设置步骤总结

1. **创建 KV 命名空间**
   - SUPPLIER_APPLICATIONS
   - ADMIN_USERS  
   - ADMIN_SESSIONS

2. **添加管理员账户**
   - 在 ADMIN_USERS 中添加 `user:admin`
   - 在 ADMIN_USERS 中添加 `user:pgs-admin`

3. **初始化统计数据**
   - 在 SUPPLIER_APPLICATIONS 中添加各种索引键

4. **部署 Worker**
   - 上传代码文件
   - 配置环境变量
   - 绑定 KV 命名空间

5. **测试系统**
   - 健康检查
   - 管理员登录
   - 申请提交

6. **更新前端配置**
   - 设置 API 基础 URL
   - 测试前后端连接

## ⚠️ 安全提醒

1. **立即修改默认密码**
   - 首次登录后必须修改密码
   - 使用强密码（至少8位，包含字母数字特殊字符）

2. **更新 JWT 密钥**
   - 在 Worker 环境变量中设置强随机 JWT_SECRET
   - 至少32个字符的随机字符串

3. **限制访问域名**
   - 在 FRONTEND_URL 中设置正确的前端域名
   - 避免使用通配符 "*"

4. **定期备份数据**
   - 定期导出 KV 数据
   - 监控系统运行状态

## 🔄 数据迁移

如果需要从其他系统迁移数据，请参考以下格式要求：

### 申请数据格式
- 所有日期使用 ISO 8601 格式
- 状态只能是 pending/approved/rejected
- 主营业务使用预定义的值数组
- 邮箱和电话需要通过验证

### 用户数据格式
- 密码必须使用指定的哈希算法
- 角色目前只支持 admin
- 邮箱必须唯一

### 索引数据
- 添加新申请时必须更新所有相关索引
- 统计数据需要保持一致性