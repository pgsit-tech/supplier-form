import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// 登录验证模式
const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
})

// 模拟管理员用户数据（实际项目中应该从数据库获取）
const ADMIN_USERS = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123', // 实际项目中应该使用哈希密码
    name: 'PGS管理员',
    role: 'admin'
  },
  {
    id: 2,
    username: 'pgs-admin',
    password: 'pgs2025',
    name: 'PGS系统管理员',
    role: 'admin'
  }
]

// 生成简单的JWT token（实际项目中应该使用更安全的方法）
function generateToken(user: any) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24小时过期
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证请求数据
    const validatedData = loginSchema.parse(body)
    
    // 查找用户
    const user = ADMIN_USERS.find(
      u => u.username === validatedData.username && u.password === validatedData.password
    )
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: '用户名或密码错误'
      }, { status: 401 })
    }
    
    // 生成token
    const token = generateToken(user)
    
    // 返回用户信息（不包含密码）
    const { password, ...userInfo } = user
    
    return NextResponse.json({
      success: true,
      message: '登录成功',
      token,
      user: userInfo
    })
    
  } catch (error) {
    console.error('登录错误:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: '请求数据格式错误',
        errors: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      message: '服务器内部错误'
    }, { status: 500 })
  }
}