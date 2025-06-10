'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone
} from 'lucide-react'
import {
  supplierFormSchema,
  type SupplierFormData,
  branchOptions,
  businessOptions,
  companyTypeOptions,
  agreementOptions,
} from '@/lib/validations'

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      mainBusiness: [],
    },
  })

  const watchedBusiness = watch('mainBusiness')

  const onSubmit = async (data: SupplierFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        console.log('提交成功:', result.data)
        setSubmitSuccess(true)
      } else {
        throw new Error(result.message || '提交失败')
      }
    } catch (error) {
      console.error('提交失败:', error)
      alert(`提交失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBusinessChange = (value: string, checked: boolean) => {
    const currentBusiness = watchedBusiness || []
    if (checked) {
      setValue('mainBusiness', [...currentBusiness, value])
    } else {
      setValue('mainBusiness', currentBusiness.filter(item => item !== value))
    }
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-white shadow-lg rounded-lg">
            <div className="px-4 py-5 sm:p-6 text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">提交成功！</h2>
              <p className="text-gray-600 mb-8 text-lg">
                您的供应商申请表已成功提交，我们将尽快处理您的申请。
              </p>
              <button 
                onClick={() => setSubmitSuccess(false)}
                className="inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                提交新的申请
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto p-6">
        {/* 页面头部 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            供应商系统CODE申请备案表
          </h1>
          <p className="text-xl text-gray-600">
            PGS 內部表格
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* 申请人信息 */}
          <div className="bg-white shadow-lg rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">申请人信息</h3>
                  <p className="mt-1 text-sm text-gray-500">请填写申请人的基本信息</p>
                </div>
              </div>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    申请人邮箱 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="请输入邮箱地址"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                    {...register('applicantEmail')}
                  />
                  {errors.applicantEmail && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.applicantEmail.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    申请人所属分公司 <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                    {...register('applicantBranch')}
                  >
                    <option value="">请选择分公司</option>
                    {branchOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.applicantBranch && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.applicantBranch.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 供应商基本信息 */}
          <div className="bg-white shadow-lg rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">供应商基本信息</h3>
                  <p className="mt-1 text-sm text-gray-500">请填写供应商的基本信息</p>
                </div>
              </div>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      供应商名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      placeholder="请输入供应商名称"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                      {...register('supplierName')}
                    />
                    {errors.supplierName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {errors.supplierName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      FM3000 Code（如已生成请提供）
                    </label>
                    <input
                      placeholder="请输入FM3000 Code"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                      {...register('fm3000Code')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    供应商公司地址 <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-1">中文名配中文地址 / 英文配英文地址</p>
                  <input
                    placeholder="请输入完整的公司地址"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                    {...register('supplierAddress')}
                  />
                  {errors.supplierAddress && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.supplierAddress.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      企业创立日期
                    </label>
                    <input
                      type="date"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                      {...register('establishDate')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      注册资本 (万元)
                    </label>
                    <input
                      type="number"
                      placeholder="请输入注册资本"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                      {...register('registeredCapital')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      法人代表
                    </label>
                    <input
                      placeholder="请输入法人代表姓名"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                      {...register('legalRepresentative')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      注册地
                    </label>
                    <input
                      placeholder="请输入注册地"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                      {...register('registrationLocation')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      企业性质
                    </label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                      {...register('companyType')}
                    >
                      <option value="">请选择企业性质</option>
                      {companyTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      是否为一般纳税人
                    </label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                      {...register('isTaxpayer')}
                    >
                      <option value="">请选择</option>
                      <option value="yes">是</option>
                      <option value="no">否</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 主营业务 */}
          <div className="bg-white shadow-lg rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">主营业务</h3>
                  <p className="mt-1 text-sm text-gray-500">请选择供应商的主营业务类型</p>
                </div>
              </div>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    主营业务类型 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {businessOptions.map((option) => (
                      <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          value={option.value}
                          checked={watchedBusiness?.includes(option.value) || false}
                          onChange={(e) => handleBusinessChange(option.value, e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.mainBusiness && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.mainBusiness.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    业务描述
                  </label>
                  <p className="text-xs text-gray-500 mb-1">请详细描述您的主营业务</p>
                  <textarea
                    rows={3}
                    placeholder="请详细描述您的主营业务内容..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                    {...register('businessDescription')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 联系信息 */}
          <div className="bg-white shadow-lg rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600">
                  <Phone size={20} />
                </div>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">联系信息</h3>
                  <p className="mt-1 text-sm text-gray-500">请填写联系人信息</p>
                </div>
              </div>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    联系人及职务 <span className="text-red-500">*</span>
                  </label>
                  <input
                    placeholder="请输入联系人姓名及职务，如：张三 - 销售经理"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                    {...register('contactPersonAndTitle')}
                  />
                  {errors.contactPersonAndTitle && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.contactPersonAndTitle.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      联系电话 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="请输入联系电话"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                      {...register('contactPhone')}
                    />
                    {errors.contactPhone && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {errors.contactPhone.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      联系人邮箱 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="请输入联系人邮箱"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                      {...register('contactEmail')}
                    />
                    {errors.contactEmail && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {errors.contactEmail.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 协议签署状态 */}
          <div className="bg-white shadow-lg rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">协议签署状态</h3>
                  <p className="mt-1 text-sm text-gray-500">请选择是否已签署协议</p>
                </div>
              </div>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  是否已签署协议 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {agreementOptions.map((option) => (
                    <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        value={option.value}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        {...register('agreementSigned')}
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.agreementSigned && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.agreementSigned.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 使用理由和信息来源 */}
          <div className="bg-white shadow-lg rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">补充信息</h3>
                  <p className="mt-1 text-sm text-gray-500">请提供使用理由和信息来源</p>
                </div>
              </div>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    使用此供应商理由 <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-1">说明为何选用此供应商</p>
                  <textarea
                    rows={3}
                    placeholder="请详细说明选择此供应商的理由..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                    {...register('usageReason')}
                  />
                  {errors.usageReason && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.usageReason.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    如何得知此供应商 <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-1">說明詳細信息，如：介紹人的背景或海外代理的名字</p>
                  <textarea
                    rows={3}
                    placeholder="请详细说明如何得知此供应商的信息..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                    {...register('supplierSource')}
                  />
                  {errors.supplierSource && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.supplierSource.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-center pt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交申请'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}