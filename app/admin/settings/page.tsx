'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Type,
  Globe,
  Eye
} from 'lucide-react'
import { buildApiUrl } from '../../../lib/api-config'

interface SystemConfig {
  title: string
  subtitle: string
  description: string
  updatedAt?: string
}

export default function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig>({
    title: '供应商申请系统',
    subtitle: 'PGS物流',
    description: 'PGS物流供应商申请管理系统，提供供应商信息提交和审批管理功能'
  })
  const [originalConfig, setOriginalConfig] = useState<SystemConfig>({
    title: '供应商申请系统',
    subtitle: 'PGS物流', 
    description: 'PGS物流供应商申请管理系统，提供供应商信息提交和审批管理功能'
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const router = useRouter()

  // 检查是否有未保存的更改
  useEffect(() => {
    const changed = JSON.stringify(config) !== JSON.stringify(originalConfig)
    setHasChanges(changed)
  }, [config, originalConfig])

  // 加载系统配置
  const loadConfig = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/admin/login')
        return
      }

      const response = await fetch(buildApiUrl('/api/admin/system-config'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.config) {
          setConfig(data.config)
          setOriginalConfig(data.config)
        }
      } else if (response.status === 401) {
        router.push('/admin/login')
      }
    } catch (error) {
      console.error('加载配置失败:', error)
      setMessage({ type: 'error', text: '加载配置失败，请刷新页面重试' })
    } finally {
      setLoading(false)
    }
  }

  // 保存系统配置
  const saveConfig = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/admin/login')
        return
      }

      const response = await fetch(buildApiUrl('/api/admin/system-config'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setOriginalConfig(config)
        setMessage({ type: 'success', text: '系统配置保存成功！' })
        
        // 3秒后清除成功消息
        setTimeout(() => {
          setMessage(null)
        }, 3000)
      } else {
        setMessage({ type: 'error', text: data.message || '保存失败，请重试' })
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      setMessage({ type: 'error', text: '网络错误，请稍后重试' })
    } finally {
      setSaving(false)
    }
  }

  // 重置配置
  const resetConfig = () => {
    setConfig(originalConfig)
    setMessage(null)
  }

  // 预览效果
  const previewTitle = `${config.title} - ${config.subtitle}`

  useEffect(() => {
    loadConfig()
  }, [])

  const handleInputChange = (field: keyof SystemConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
    // 清除消息
    if (message) setMessage(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mr-4"
              >
                <ArrowLeft size={16} className="mr-1" />
                返回管理面板
              </button>
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-indigo-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
                  <p className="text-sm text-gray-500">配置系统标题和基本信息</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <button
                  onClick={resetConfig}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <RefreshCw size={16} className="mr-1" />
                  重置
                </button>
              )}
              <button
                onClick={saveConfig}
                disabled={saving || !hasChanges}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    保存中...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-1" />
                    保存配置
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* 消息提示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-md flex items-center ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle size={20} className="mr-3" />
            ) : (
              <XCircle size={20} className="mr-3" />
            )}
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500">加载配置中...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 配置表单 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Type className="h-5 w-5 text-gray-400 mr-2" />
                  系统标题配置
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  配置系统在各个页面显示的标题和描述信息
                </p>
              </div>
              
              <div className="px-6 py-6 space-y-6">
                {/* 主标题 */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    系统主标题
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={config.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="例如：供应商申请系统"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    显示在浏览器标题栏和页面头部的主标题
                  </p>
                </div>

                {/* 副标题 */}
                <div>
                  <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700 mb-2">
                    系统副标题
                  </label>
                  <input
                    type="text"
                    id="subtitle"
                    value={config.subtitle}
                    onChange={(e) => handleInputChange('subtitle', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="例如：PGS物流"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    显示在主标题后面的副标题或公司名称
                  </p>
                </div>

                {/* 系统描述 */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    系统描述
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={config.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="例如：PGS物流供应商申请管理系统，提供供应商信息提交和审批管理功能"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    显示在页面meta描述和介绍区域的详细描述
                  </p>
                </div>
              </div>
            </div>

            {/* 预览效果 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Eye className="h-5 w-5 text-gray-400 mr-2" />
                  预览效果
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  查看配置更改后的显示效果
                </p>
              </div>
              
              <div className="px-6 py-6">
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">浏览器标题栏：</h4>
                    <div className="bg-white border rounded p-2 text-sm">
                      {previewTitle}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">页面标题：</h4>
                    <div className="bg-white border rounded p-4">
                      <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
                      {config.subtitle && (
                        <p className="text-lg text-gray-600 mt-1">{config.subtitle}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">系统描述：</h4>
                    <div className="bg-white border rounded p-3 text-sm text-gray-600">
                      {config.description}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
