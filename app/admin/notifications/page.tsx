'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bell, 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  Webhook,
  Send,
  TestTube,
  AlertTriangle
} from 'lucide-react'
import { buildApiUrl } from '../../../lib/api-config'

interface NotificationConfig {
  wechatEnabled: boolean
  wechatWebhookUrl: string
  webhookEnabled: boolean
  webhookUrl: string
  notifyOnSubmit: boolean
  notifyOnApprove: boolean
  notifyOnReject: boolean
  updatedAt?: string
}

export default function NotificationSettings() {
  const [config, setConfig] = useState<NotificationConfig>({
    wechatEnabled: false,
    wechatWebhookUrl: '',
    webhookEnabled: false,
    webhookUrl: '',
    notifyOnSubmit: true,
    notifyOnApprove: true,
    notifyOnReject: true
  })
  const [originalConfig, setOriginalConfig] = useState<NotificationConfig>({
    wechatEnabled: false,
    wechatWebhookUrl: '',
    webhookEnabled: false,
    webhookUrl: '',
    notifyOnSubmit: true,
    notifyOnApprove: true,
    notifyOnReject: true
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<'wechat' | 'webhook' | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const router = useRouter()

  // 检查是否有未保存的更改
  useEffect(() => {
    const changed = JSON.stringify(config) !== JSON.stringify(originalConfig)
    setHasChanges(changed)
  }, [config, originalConfig])

  // 加载通知配置
  const loadConfig = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/admin/login')
        return
      }

      const response = await fetch(buildApiUrl('/api/admin/notification-config'), {
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
      console.error('加载通知配置失败:', error)
      setMessage({ type: 'error', text: '加载配置失败，请刷新页面重试' })
    } finally {
      setLoading(false)
    }
  }

  // 保存通知配置
  const saveConfig = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/admin/login')
        return
      }

      const response = await fetch(buildApiUrl('/api/admin/notification-config'), {
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
        setMessage({ type: 'success', text: '通知配置保存成功！' })
        
        // 3秒后清除成功消息
        setTimeout(() => {
          setMessage(null)
        }, 3000)
      } else {
        setMessage({ type: 'error', text: data.message || '保存失败，请重试' })
      }
    } catch (error) {
      console.error('保存通知配置失败:', error)
      setMessage({ type: 'error', text: '网络错误，请稍后重试' })
    } finally {
      setSaving(false)
    }
  }

  // 测试通知
  const testNotification = async (type: 'wechat' | 'webhook') => {
    setTesting(type)
    setMessage(null)

    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/admin/login')
        return
      }

      const response = await fetch(buildApiUrl('/api/admin/test-notification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          config: type === 'wechat' ? {
            webhookUrl: config.wechatWebhookUrl
          } : {
            webhookUrl: config.webhookUrl
          }
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: `${type === 'wechat' ? '企业微信' : 'Webhook'}通知测试成功！` })
      } else {
        setMessage({ type: 'error', text: data.message || '测试失败，请检查配置' })
      }
    } catch (error) {
      console.error('测试通知失败:', error)
      setMessage({ type: 'error', text: '网络错误，请稍后重试' })
    } finally {
      setTesting(null)
    }
  }

  // 重置配置
  const resetConfig = () => {
    setConfig(originalConfig)
    setMessage(null)
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const handleInputChange = (field: keyof NotificationConfig, value: string | boolean) => {
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
                <Bell className="h-8 w-8 text-indigo-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">通知设置</h1>
                  <p className="text-sm text-gray-500">配置企业微信和Webhook通知</p>
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
            {/* 企业微信通知配置 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
                  企业微信通知
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  配置企业微信群机器人通知
                </p>
              </div>
              
              <div className="px-6 py-6 space-y-6">
                {/* 启用开关 */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      启用企业微信通知
                    </label>
                    <p className="text-xs text-gray-500">
                      开启后将向企业微信群发送申请状态变更通知
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.wechatEnabled}
                      onChange={(e) => handleInputChange('wechatEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Webhook URL */}
                <div>
                  <label htmlFor="wechatWebhookUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    企业微信群机器人 Webhook URL
                  </label>
                  <input
                    type="url"
                    id="wechatWebhookUrl"
                    value={config.wechatWebhookUrl}
                    onChange={(e) => handleInputChange('wechatWebhookUrl', e.target.value)}
                    disabled={!config.wechatEnabled}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    在企业微信群中添加机器人，复制Webhook地址到此处
                  </p>
                </div>

                {/* 测试按钮 */}
                <div>
                  <button
                    onClick={() => testNotification('wechat')}
                    disabled={!config.wechatEnabled || !config.wechatWebhookUrl || testing === 'wechat'}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing === 'wechat' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        测试中...
                      </>
                    ) : (
                      <>
                        <TestTube size={16} className="mr-1" />
                        测试通知
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Webhook通知配置 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Webhook className="h-5 w-5 text-gray-400 mr-2" />
                  Webhook通知
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  配置自定义Webhook通知
                </p>
              </div>
              
              <div className="px-6 py-6 space-y-6">
                {/* 启用开关 */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      启用Webhook通知
                    </label>
                    <p className="text-xs text-gray-500">
                      开启后将向指定URL发送POST请求通知
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.webhookEnabled}
                      onChange={(e) => handleInputChange('webhookEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Webhook URL */}
                <div>
                  <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    id="webhookUrl"
                    value={config.webhookUrl}
                    onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                    disabled={!config.webhookEnabled}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="https://your-domain.com/webhook/notifications"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    系统将向此URL发送POST请求，包含申请状态变更信息
                  </p>
                </div>

                {/* 测试按钮 */}
                <div>
                  <button
                    onClick={() => testNotification('webhook')}
                    disabled={!config.webhookEnabled || !config.webhookUrl || testing === 'webhook'}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing === 'webhook' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        测试中...
                      </>
                    ) : (
                      <>
                        <TestTube size={16} className="mr-1" />
                        测试通知
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 通知触发条件 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Send className="h-5 w-5 text-gray-400 mr-2" />
                  通知触发条件
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  选择在哪些情况下发送通知
                </p>
              </div>

              <div className="px-6 py-6 space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.notifyOnSubmit}
                      onChange={(e) => handleInputChange('notifyOnSubmit', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">新申请提交时</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.notifyOnApprove}
                      onChange={(e) => handleInputChange('notifyOnApprove', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">申请被批准时</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.notifyOnReject}
                      onChange={(e) => handleInputChange('notifyOnReject', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">申请被拒绝时</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 通知模板说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-2">通知模板说明</h4>
                  <div className="text-sm text-blue-700 space-y-2">
                    <p><strong>企业微信通知格式：</strong></p>
                    <div className="bg-white border rounded p-3 text-xs font-mono">
                      📋 供应商申请状态更新<br/>
                      供应商：[供应商名称]<br/>
                      申请人：[申请人邮箱]<br/>
                      状态：[待审核/已批准/已拒绝]<br/>
                      时间：[更新时间]
                    </div>

                    <p className="mt-3"><strong>Webhook通知数据格式：</strong></p>
                    <div className="bg-white border rounded p-3 text-xs font-mono">
                      {`{
  "type": "status_change",
  "application": {
    "id": "app_123",
    "supplierName": "示例公司",
    "applicantEmail": "user@example.com",
    "status": "approved",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}`}
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
