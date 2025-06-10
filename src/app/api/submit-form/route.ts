import { NextRequest, NextResponse } from 'next/server'
import { supplierFormSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证表单数据
    const validatedData = supplierFormSchema.parse(body)
    
    // 这里可以添加数据库保存逻辑
    console.log('收到供应商申请:', validatedData)
    
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return NextResponse.json({
      success: true,
      message: '申请提交成功',
      data: validatedData
    })
  } catch (error) {
    console.error('表单提交错误:', error)
    
    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        message: '表单验证失败',
        error: error.message
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      message: '服务器内部错误'
    }, { status: 500 })
  }
}