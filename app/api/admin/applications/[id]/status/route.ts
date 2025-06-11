import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// 状态更新验证模式
const statusUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected'])
})

// 验证管理员token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  try {
    const token = authHeader.substring(7)
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())
    
    // 检查token是否过期
    if (payload.exp < Date.now()) {
      return null
    }
    
    return payload
  } catch (error) {
    return null
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const user = verifyAdminToken(request)
    if (!user) {
      return NextResponse.json({
        success: false,
        message: '未授权访问'
      }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = statusUpdateSchema.parse(body)
    
    // 这里应该更新数据库中的状态
    // 目前只是模拟成功响应
    console.log(`更新申请 ${params.id} 状态为: ${validatedData.status}`)
    console.log(`操作人: ${user.username}`)
    
    return NextResponse.json({
      success: true,
      message: '状态更新成功',
      data: {
        id: params.id,
        status: validatedData.status,
        updatedBy: user.username,
        updatedAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('状态更新错误:', error)
    
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