'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  FileText,
  Download,
  Eye,
  Edit,
  Search,
  Filter,
  LogOut,
  Calendar,
  Building2,
  Mail,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { buildApiUrl, API_ENDPOINTS } from '../../../lib/api-config'

interface SupplierApplication {
  id: string
  applicantEmail: string
  applicantBranch: string
  supplierName: string
  supplierAddress: string
  contactPersonAndTitle: string
  contactPhone: string
  contactEmail: string
  agreementSigned: string
  mainBusiness: string[]
  usageReason: string
  supplierSource: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  fm3000Code?: string
  establishDate?: string
  registeredCapital?: string
  legalRepresentative?: string
  registrationLocation?: string
  companyType?: string
  isTaxpayer?: string
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [applications, setApplications] = useState<SupplierApplication[]>([])
  const [filteredApplications, setFilteredApplications] = useState<SupplierApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedApplication, setSelectedApplication] = useState<SupplierApplication | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem('admin_token')
    const userData = localStorage.getItem('admin_user')
    
    if (!token || !userData) {
      router.push('/admin/login')
      return
    }
    
    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      loadApplications()
    } catch (error) {
      console.error('用户数据解析错误:', error)
      router.push('/admin/login')
    }
  }, [router])

  const loadApplications = async () => {
    try {
      // 使用 API 配置
      const apiUrl = buildApiUrl(API_ENDPOINTS.APPLICATIONS);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
        setFilteredApplications(data.applications || [])
      } else {
        console.error('加载申请数据失败')
      }
    } catch (error) {
      console.error('加载申请数据错误:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push('/admin/login')
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    filterApplications(term, statusFilter)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    filterApplications(searchTerm, status)
  }

  const filterApplications = (search: string, status: string) => {
    let filtered = applications

    if (search) {
      filtered = filtered.filter(app => 
        app.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        app.applicantEmail.toLowerCase().includes(search.toLowerCase()) ||
        app.contactPersonAndTitle.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (status !== 'all') {
      filtered = filtered.filter(app => app.status === status)
    }

    setFilteredApplications(filtered)
  }

  const updateApplicationStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      // 使用 API 配置
      const apiUrl = buildApiUrl(API_ENDPOINTS.APPLICATION_STATUS(id));

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        // 更新本地状态
        setApplications(prev => 
          prev.map(app => 
            app.id === id ? { ...app, status: newStatus } : app
          )
        )
        filterApplications(searchTerm, statusFilter)
        alert(`申请已${newStatus === 'approved' ? '批准' : '拒绝'}`)
      } else {
        alert('状态更新失败')
      }
    } catch (error) {
      console.error('状态更新错误:', error)
      alert('状态更新失败')
    }
  }

  const exportToCSV = () => {
    const headers = [
      '申请ID', '申请人邮箱', '分公司', '供应商名称', '公司地址',
      '联系人及职务', '联系电话', '联系邮箱', '协议签署', '主营业务',
      '使用理由', '信息来源', '状态', '提交时间'
    ]

    const csvContent = [
      headers.join(','),
      ...filteredApplications.map(app => [
        app.id,
        app.applicantEmail,
        app.applicantBranch,
        `"${app.supplierName}"`,
        `"${app.supplierAddress}"`,
        `"${app.contactPersonAndTitle || ''}"`,
        app.contactPhone || '',
        app.contactEmail || '',
        app.agreementSigned,
        `"${app.mainBusiness.join(', ')}"`,
        `"${app.usageReason}"`,
        `"${app.supplierSource}"`,
        app.status === 'pending' ? '待审核' : app.status === 'approved' ? '已批准' : '已拒绝',
        new Date(app.submittedAt).toLocaleString('zh-CN')
      ].join(','))
    ].join('\n')

    // 添加 BOM 以确保中文在 Excel 中正确显示
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `供应商申请数据-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: '待审核' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: '已批准' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, text: '已拒绝' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig]
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon size={12} className="mr-1" />
        {config.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <h1 className="ml-3 text-xl font-semibold text-gray-900">
                供应商管理系统
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                欢迎，{user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
              >
                <LogOut size={16} className="mr-1" />
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      总申请数
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {applications.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      待审核
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {applications.filter(app => app.status === 'pending').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      已批准
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {applications.filter(app => app.status === 'approved').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      已拒绝
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {applications.filter(app => app.status === 'rejected').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  搜索条件
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="搜索供应商名称、申请人邮箱或联系人..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="block w-full h-10 pl-10 pr-3 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div className="min-w-[120px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    状态筛选
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilter(e.target.value)}
                    className="block w-full h-10 pl-3 pr-8 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm rounded-md bg-white"
                  >
                    <option value="all">所有状态</option>
                    <option value="pending">待审核</option>
                    <option value="approved">已批准</option>
                    <option value="rejected">已拒绝</option>
                  </select>
                </div>
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center justify-center h-10 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap"
                >
                  <Download size={16} className="mr-2" />
                  导出CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 申请列表 - 三列表格布局 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    基本信息
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    审批状态
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      暂无申请数据
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      {/* 第一列：基本信息 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {application.supplierName}
                          </div>
                          <div className="text-sm text-gray-500 space-y-1">
                            <div className="flex items-center">
                              <Mail className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <span className="truncate">{application.applicantEmail}</span>
                            </div>
                            <div className="flex items-center">
                              <Building2 className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <span>{application.applicantBranch}</span>
                              <span className="mx-2">•</span>
                              <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <span>{new Date(application.submittedAt).toLocaleDateString('zh-CN')}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 第二列：审批状态 */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(application.status)}
                        </div>
                      </td>

                      {/* 第三列：操作按钮 */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedApplication(application)
                              setShowDetails(true)
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <Eye size={14} className="mr-1" />
                            查看
                          </button>
                          {application.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateApplicationStatus(application.id, 'approved')}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                <CheckCircle size={14} className="mr-1" />
                                批准
                              </button>
                              <button
                                onClick={() => updateApplicationStatus(application.id, 'rejected')}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                <XCircle size={14} className="mr-1" />
                                拒绝
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 详情模态框 */}
      {showDetails && selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  申请详情 - {selectedApplication.supplierName}
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={24} />
                </button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">申请人邮箱</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication.applicantEmail}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">所属分公司</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication.applicantBranch}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">供应商名称</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication.supplierName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">FM3000 Code</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication.fm3000Code || '未提供'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">公司地址</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedApplication.supplierAddress}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">联系人及职务</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication.contactPersonAndTitle}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">联系电话</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication.contactPhone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">联系邮箱</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication.contactEmail}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">协议签署状态</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedApplication.agreementSigned === 'yes' ? '是，已签' : '否，没签'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">主营业务</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedApplication.mainBusiness.join(', ')}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">使用理由</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedApplication.usageReason}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">信息来源</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedApplication.supplierSource}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">申请状态</label>
                    <div className="mt-1">{getStatusBadge(selectedApplication.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">提交时间</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedApplication.submittedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                {selectedApplication.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        updateApplicationStatus(selectedApplication.id, 'approved')
                        setShowDetails(false)
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      批准申请
                    </button>
                    <button
                      onClick={() => {
                        updateApplicationStatus(selectedApplication.id, 'rejected')
                        setShowDetails(false)
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <XCircle size={16} className="mr-2" />
                      拒绝申请
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDetails(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}