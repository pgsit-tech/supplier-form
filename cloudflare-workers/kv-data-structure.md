# Cloudflare KV 数据结构设计

## 1. SUPPLIER_APPLICATIONS 命名空间

### 键值结构
```
键格式: application:{uuid}
值格式: JSON 对象
```

### 数据示例
```json
{
  "id": "app_2025061101",
  "applicantEmail": "zhang.san@pgs.com",
  "applicantBranch": "SHA",
  "supplierName": "上海优质物流有限公司",
  "supplierAddress": "上海市浦东新区陆家嘴金融贸易区世纪大道100号",
  "contactPersonAndTitle": "李经理 - 业务总监",
  "contactPhone": "021-58888888",
  "contactEmail": "li.manager@logistics.com",
  "agreementSigned": "yes",
  "mainBusiness": ["agent", "booking", "warehouse"],
  "usageReason": "该供应商在物流行业有超过10年的经验...",
  "supplierSource": "通过行业协会推荐...",
  "status": "pending",
  "submittedAt": "2025-06-11T10:30:00Z",
  "updatedAt": "2025-06-11T10:30:00Z",
  "fm3000Code": "FM2025001",
  "establishDate": "2010-03-15",
  "registeredCapital": "5000",
  "legalRepresentative": "李总",
  "registrationLocation": "上海市",
  "companyType": "limited",
  "isTaxpayer": "yes"
}
```

### 索引键（用于查询）
```
applications:list -> ["app_2025061101", "app_2025061102", ...]
applications:by_status:pending -> ["app_2025061101", ...]
applications:by_status:approved -> ["app_2025061102", ...]
applications:by_status:rejected -> ["app_2025061103", ...]
applications:stats -> {"total": 10, "pending": 3, "approved": 5, "rejected": 2}
```

## 2. ADMIN_USERS 命名空间

### 键值结构
```
键格式: user:{username}
值格式: JSON 对象
```

### 数据示例
```json
{
  "id": "admin_001",
  "username": "admin",
  "passwordHash": "$2b$10$...", // bcrypt 哈希
  "name": "PGS管理员",
  "role": "admin",
  "email": "admin@pgs.com",
  "createdAt": "2025-06-11T10:00:00Z",
  "lastLoginAt": "2025-06-11T10:30:00Z",
  "isActive": true
}
```

### 初始管理员数据
```json
// user:admin
{
  "id": "admin_001",
  "username": "admin",
  "passwordHash": "$2b$10$N9qo8uLOickgx2ZMRZoMye.IjdQXjJJOJJJOJJJOJJJOJJJOJJJOJJ",
  "name": "PGS管理员",
  "role": "admin",
  "email": "admin@pgs.com",
  "createdAt": "2025-06-11T10:00:00Z",
  "isActive": true
}

// user:pgs-admin
{
  "id": "admin_002", 
  "username": "pgs-admin",
  "passwordHash": "$2b$10$N9qo8uLOickgx2ZMRZoMye.IjdQXjJJOJJJOJJJOJJJOJJJOJJJOJJ",
  "name": "PGS系统管理员",
  "role": "admin",
  "email": "pgs-admin@pgs.com",
  "createdAt": "2025-06-11T10:00:00Z",
  "isActive": true
}
```

## 3. ADMIN_SESSIONS 命名空间

### 键值结构
```
键格式: session:{sessionId}
值格式: JSON 对象
```

### 数据示例
```json
{
  "sessionId": "sess_abc123def456",
  "userId": "admin_001",
  "username": "admin",
  "role": "admin",
  "createdAt": "2025-06-11T10:30:00Z",
  "expiresAt": "2025-06-12T10:30:00Z",
  "lastAccessAt": "2025-06-11T11:00:00Z",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

### 会话索引
```
sessions:by_user:{userId} -> ["sess_abc123def456", ...]
sessions:active -> ["sess_abc123def456", "sess_def456ghi789", ...]
```

## 4. 数据持久性和可靠性

### Cloudflare KV 特性
- **全球分布**: 数据复制到全球 200+ 数据中心
- **最终一致性**: 写入后 60 秒内全球同步
- **高可用性**: 99.9% 可用性保证
- **自动备份**: Cloudflare 自动处理数据备份
- **无限存储**: 按使用量计费，无存储限制

### 数据备份方案
1. **定期导出**: 通过 Workers 定期导出数据到外部存储
2. **版本控制**: 重要数据变更时保留历史版本
3. **监控告警**: 设置数据异常监控

### 一致性保证
- **读取**: 强一致性（从最近的边缘节点读取）
- **写入**: 最终一致性（60秒内全球同步）
- **事务**: 不支持 ACID 事务，需要应用层处理

## 5. 性能优化

### 键命名最佳实践
- 使用前缀分组相关数据
- 避免热键（高频访问的单个键）
- 使用有意义的键名便于调试

### 查询优化
- 使用索引键加速查询
- 批量操作减少 API 调用
- 缓存频繁访问的数据

### 限制说明
- 单个值最大 25MB
- 键名最大 512 字节
- 每秒写入限制（根据计划）
- 列表操作限制 1000 个键