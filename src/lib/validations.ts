import { z } from 'zod'

// 分公司选项 (根据实际表单)
export const branchOptions = [
  { value: 'BJS', label: 'BJS' },
  { value: 'CAN', label: 'CAN' },
  { value: 'CGO', label: 'CGO' },
  { value: 'NGB', label: 'NGB' },
  { value: 'QDO', label: 'QDO' },
  { value: 'SHA', label: 'SHA' },
  { value: 'SZX', label: 'SZX' },
  { value: 'TSN', label: 'TSN' },
  { value: 'XMN', label: 'XMN' },
]

// 主营业务选项 (根据实际表单)
export const businessOptions = [
  { value: 'agent', label: '一代' },
  { value: 'booking', label: '订舱' },
  { value: 'shipping', label: '船東' },
  { value: 'trucking', label: '拖車' },
  { value: 'warehouse', label: '倉庫' },
  { value: 'customs', label: '報關' },
  { value: 'lcl', label: '拼箱' },
  { value: 'buyorder', label: '買單報關' },
  { value: 'other', label: '其他' },
]

// 企业性质选项
export const companyTypeOptions = [
  { value: 'limited', label: '有限责任公司' },
  { value: 'joint', label: '股份有限公司' },
  { value: 'individual', label: '个体工商户' },
  { value: 'partnership', label: '合伙企业' },
  { value: 'foreign', label: '外商投资企业' },
  { value: 'other', label: '其他' },
]

// 是否签署协议选项
export const agreementOptions = [
  { value: 'yes', label: '是, 已簽' },
  { value: 'no', label: '否, 沒簽' },
]

// 表单验证模式 (根据实际表单)
export const supplierFormSchema = z.object({
  // 申请人信息
  applicantEmail: z
    .string()
    .min(1, '请输入申请人邮箱')
    .email('请输入有效的邮箱地址'),

  applicantBranch: z
    .string()
    .min(1, '请选择申请人所属分公司'),

  // 供应商基本信息
  supplierName: z
    .string()
    .min(1, '请输入供应商名称')
    .min(2, '供应商名称至少2个字符'),

  fm3000Code: z
    .string()
    .optional(),

  supplierAddress: z
    .string()
    .min(1, '请输入供应商公司地址')
    .min(5, '地址信息过于简单，请输入完整地址'),

  // 企业详细信息
  establishDate: z
    .string()
    .optional(),

  registeredCapital: z
    .string()
    .optional(),

  legalRepresentative: z
    .string()
    .optional(),

  registrationLocation: z
    .string()
    .optional(),

  companyType: z
    .string()
    .optional(),

  isTaxpayer: z
    .string()
    .optional(),

  // 联系信息
  contactPersonAndTitle: z
    .string()
    .min(1, '请输入联系人及职务'),

  contactPhone: z
    .string()
    .min(1, '请输入联系电话'),

  contactEmail: z
    .string()
    .min(1, '请输入联系人邮箱')
    .email('请输入有效的邮箱地址'),

  // 协议状态
  agreementSigned: z
    .string()
    .min(1, '请选择是否已签署协议'),

  // 主营业务
  mainBusiness: z
    .array(z.string())
    .min(1, '请至少选择一项主营业务'),

  // 使用理由和信息来源
  usageReason: z
    .string()
    .min(1, '请说明使用此供应商的理由')
    .min(10, '请详细说明使用理由'),

  supplierSource: z
    .string()
    .min(1, '请说明如何得知此供应商')
    .min(10, '请详细说明信息来源'),
})

export type SupplierFormData = z.infer<typeof supplierFormSchema>
