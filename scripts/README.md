# 📊 Cloudflare Pages 部署监控脚本

## 🚀 功能特性

- **实时部署状态检查** - 通过 Cloudflare API 获取最新部署状态
- **部署历史查看** - 显示最近 5 次部署的详细信息
- **错误日志获取** - 自动获取失败部署的错误日志
- **友好的输出格式** - 使用图标和颜色显示状态

## 📋 使用方法

### 1. 获取 Cloudflare API 凭据

#### 获取 Account ID
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 在右侧边栏找到 **Account ID**
3. 复制 Account ID

#### 获取 API Token
1. 访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 **"Create Token"**
3. 使用 **"Custom token"** 模板
4. 设置权限：
   - **Account** - `Cloudflare Pages:Read`
   - **Zone** - `Zone:Read` (可选)
5. 设置账户资源：选择您的账户
6. 点击 **"Continue to summary"** → **"Create Token"**
7. 复制生成的 API Token

### 2. 设置环境变量

#### Windows (PowerShell)
\`\`\`powershell
$env:CLOUDFLARE_ACCOUNT_ID="your-account-id"
$env:CLOUDFLARE_API_TOKEN="your-api-token"
$env:CLOUDFLARE_PROJECT_NAME="supplier-form-system"
\`\`\`

#### macOS/Linux (Bash)
\`\`\`bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_PROJECT_NAME="supplier-form-system"
\`\`\`

#### 或者创建 .env 文件
\`\`\`env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_PROJECT_NAME=supplier-form-system
\`\`\`

### 3. 运行监控脚本

\`\`\`bash
# 使用 npm 脚本
npm run check-deployment

# 或直接运行
node scripts/check-deployment.js
\`\`\`

## 📊 输出示例

\`\`\`
🚀 检查 Cloudflare Pages 部署状态...

📋 获取部署列表...

📊 最近的部署 (共 15 个):

✅ SUCCESS
   ID: abc123def456
   分支: master
   提交: 19870d2
   时间: 2025/06/11 17:30:45
   URL: https://abc123def456.supplier-form-system.pages.dev

❌ FAILURE
   ID: def456ghi789
   分支: master
   提交: 684e7c1
   时间: 2025/06/11 17:25:30
   URL: https://def456ghi789.supplier-form-system.pages.dev

🔍 获取最新部署详情...

📋 最新部署详情:
   状态: ✅ success
   阶段: deploy
   开始时间: 2025/06/11 17:30:15
   结束时间: 2025/06/11 17:30:45
   持续时间: 30秒
   生产URL: https://supplier-form-system.pages.dev
\`\`\`

## 🔧 故障排除

### 常见错误

#### 1. API Token 权限不足
\`\`\`
❌ API 请求失败: 403 - {"success":false,"errors":[{"code":9109,"message":"Insufficient permissions"}]}
\`\`\`

**解决方案**: 确保 API Token 有 `Cloudflare Pages:Read` 权限

#### 2. Account ID 错误
\`\`\`
❌ API 请求失败: 404 - {"success":false,"errors":[{"code":8000000,"message":"Not found"}]}
\`\`\`

**解决方案**: 检查 Account ID 是否正确

#### 3. 项目名称错误
\`\`\`
❌ API 请求失败: 404 - {"success":false,"errors":[{"code":8000000,"message":"Not found"}]}
\`\`\`

**解决方案**: 确认项目名称与 Cloudflare Pages 中的项目名称一致

## 🔄 自动化监控

### 在 CI/CD 中使用

可以将此脚本集成到 GitHub Actions 中：

\`\`\`yaml
- name: Check Deployment Status
  env:
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_PROJECT_NAME: supplier-form-system
  run: npm run check-deployment
\`\`\`

### 定时监控

使用 cron 或任务调度器定期运行脚本：

\`\`\`bash
# 每 5 分钟检查一次
*/5 * * * * cd /path/to/project && npm run check-deployment
\`\`\`

## 📚 API 参考

脚本使用以下 Cloudflare API 端点：

- **获取部署列表**: `GET /client/v4/accounts/{account_id}/pages/projects/{project_name}/deployments`
- **获取部署详情**: `GET /client/v4/accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}`
- **获取部署日志**: `GET /client/v4/accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}/history/logs`

更多信息请参考 [Cloudflare Pages API 文档](https://developers.cloudflare.com/api/operations/pages-deployment-get-deployments)