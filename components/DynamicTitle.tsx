'use client'

import { useState, useEffect } from 'react'
import { buildApiUrl } from '../lib/api-config'

interface SystemConfig {
  title: string
  subtitle: string
  description: string
}

interface DynamicTitleProps {
  className?: string
  showSubtitle?: boolean
  showDescription?: boolean
  fallbackTitle?: string
  fallbackSubtitle?: string
  fallbackDescription?: string
}

export default function DynamicTitle({
  className = '',
  showSubtitle = true,
  showDescription = false,
  fallbackTitle = '供应商申请系统',
  fallbackSubtitle = 'PGS物流',
  fallbackDescription = 'PGS物流供应商申请管理系统，提供供应商信息提交和审批管理功能'
}: DynamicTitleProps) {
  const [config, setConfig] = useState<SystemConfig>({
    title: fallbackTitle,
    subtitle: fallbackSubtitle,
    description: fallbackDescription
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/admin/system-config'))
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.config) {
            setConfig(data.config)
          }
        }
      } catch (error) {
        console.error('加载系统配置失败:', error)
        // 使用默认配置
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
        {showSubtitle && <div className="h-6 bg-gray-200 rounded w-32"></div>}
        {showDescription && <div className="h-4 bg-gray-200 rounded w-96 mt-2"></div>}
      </div>
    )
  }

  return (
    <div className={className}>
      <h1 className="text-3xl font-bold text-gray-900">
        {config.title}
      </h1>
      {showSubtitle && config.subtitle && (
        <p className="text-xl text-gray-600 mt-2">
          {config.subtitle}
        </p>
      )}
      {showDescription && config.description && (
        <p className="text-gray-500 mt-3">
          {config.description}
        </p>
      )}
    </div>
  )
}

// 用于页面标题的简化版本
export function DynamicPageTitle({
  fallbackTitle = '供应商申请系统',
  fallbackSubtitle = 'PGS物流'
}: {
  fallbackTitle?: string
  fallbackSubtitle?: string
}) {
  const [config, setConfig] = useState<SystemConfig>({
    title: fallbackTitle,
    subtitle: fallbackSubtitle,
    description: ''
  })

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/admin/system-config'))
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.config) {
            setConfig(data.config)
          }
        }
      } catch (error) {
        console.error('加载系统配置失败:', error)
      }
    }

    loadConfig()
  }, [])

  // 更新页面标题
  useEffect(() => {
    const pageTitle = `${config.title} - ${config.subtitle}`
    document.title = pageTitle
  }, [config])

  return null // 这个组件不渲染任何内容，只用于更新页面标题
}
