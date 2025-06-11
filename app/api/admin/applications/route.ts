import { NextRequest, NextResponse } from 'next/server'

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

// 模拟申请数据（实际项目中应该从数据库获取）
const MOCK_APPLICATIONS = [
  {
    id: '1',
    applicantEmail: 'zhang.san@pgs.com',
    applicantBranch: 'SHA',
    supplierName: '上海优质物流有限公司',
    supplierAddress: '上海市浦东新区陆家嘴金融贸易区世纪大道100号',
    contactPersonAndTitle: '李经理 - 业务总监',
    contactPhone: '021-58888888',
    contactEmail: 'li.manager@logistics.com',
    agreementSigned: 'yes',
    mainBusiness: ['agent', 'booking', 'warehouse'],
    usageReason: '该供应商在物流行业有超过10年的经验，服务质量稳定可靠，价格合理，且在上海地区有良好的网络覆盖。',
    supplierSource: '通过行业协会推荐，推荐人为上海物流协会秘书长王先生，该供应商在协会中有良好声誉。',
    status: 'pending',
    submittedAt: '2025-06-10T08:30:00Z',
    fm3000Code: 'FM2025001',
    establishDate: '2010-03-15',
    registeredCapital: '5000',
    legalRepresentative: '李总',
    registrationLocation: '上海市',
    companyType: 'limited',
    isTaxpayer: 'yes'
  },
  {
    id: '2',
    applicantEmail: 'wang.li@pgs.com',
    applicantBranch: 'BJS',
    supplierName: '北京快运货代有限公司',
    supplierAddress: '北京市朝阳区建国门外大街1号',
    contactPersonAndTitle: '张总 - 总经理',
    contactPhone: '010-65888888',
    contactEmail: 'zhang.ceo@bjkuaiyun.com',
    agreementSigned: 'no',
    mainBusiness: ['trucking', 'customs'],
    usageReason: '在北京地区有强大的陆运网络，报关效率高，能够满足我们的时效要求。',
    supplierSource: '客户推荐，该供应商为我们重要客户华为公司的长期合作伙伴。',
    status: 'approved',
    submittedAt: '2025-06-09T14:20:00Z',
    fm3000Code: '',
    establishDate: '2015-08-20',
    registeredCapital: '3000',
    legalRepresentative: '张明',
    registrationLocation: '北京市',
    companyType: 'limited',
    isTaxpayer: 'yes'
  },
  {
    id: '3',
    applicantEmail: 'chen.ming@pgs.com',
    applicantBranch: 'SZX',
    supplierName: '深圳海运集装箱服务公司',
    supplierAddress: '深圳市南山区蛇口港区海运大厦',
    contactPersonAndTitle: '刘主管 - 运营主管',
    contactPhone: '0755-26888888',
    contactEmail: 'liu.ops@szhaiyun.com',
    agreementSigned: 'yes',
    mainBusiness: ['shipping', 'lcl'],
    usageReason: '专业的海运服务提供商，在华南地区有完善的港口资源。',
    supplierSource: '通过深圳港务局介绍，该公司是港务局推荐的优质服务商。',
    status: 'rejected',
    submittedAt: '2025-06-08T10:15:00Z',
    fm3000Code: 'FM2025002',
    establishDate: '2012-11-10',
    registeredCapital: '8000',
    legalRepresentative: '刘海',
    registrationLocation: '深圳市',
    companyType: 'limited',
    isTaxpayer: 'yes'
  }
]

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const user = verifyAdminToken(request)
    if (!user) {
      return NextResponse.json({
        success: false,
        message: '未授权访问'
      }, { status: 401 })
    }
    
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    
    let applications = [...MOCK_APPLICATIONS]
    
    // 按状态过滤
    if (status && status !== 'all') {
      applications = applications.filter(app => app.status === status)
    }
    
    // 按搜索词过滤
    if (search) {
      const searchLower = search.toLowerCase()
      applications = applications.filter(app => 
        app.supplierName.toLowerCase().includes(searchLower) ||
        app.applicantEmail.toLowerCase().includes(searchLower) ||
        app.contactPersonAndTitle.toLowerCase().includes(searchLower)
      )
    }
    
    // 按提交时间倒序排列
    applications.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    
    return NextResponse.json({
      success: true,
      applications,
      total: applications.length,
      stats: {
        total: MOCK_APPLICATIONS.length,
        pending: MOCK_APPLICATIONS.filter(app => app.status === 'pending').length,
        approved: MOCK_APPLICATIONS.filter(app => app.status === 'approved').length,
        rejected: MOCK_APPLICATIONS.filter(app => app.status === 'rejected').length,
      }
    })
    
  } catch (error) {
    console.error('获取申请列表错误:', error)
    return NextResponse.json({
      success: false,
      message: '服务器内部错误'
    }, { status: 500 })
  }
}