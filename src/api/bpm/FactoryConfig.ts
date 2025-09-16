import request from '@/config/axios'

export interface WorkTimeConfigVO {
  id?: number
  type: number
  atmCard:string
  createTime?: Date
}

export interface FactorySaveReqVO {
  id?: number
  type: number
  name: string
  atmCard?: string // 银行卡信息
}

export interface WorkTimeConfigBatchSaveReqVO {
  configs: FactorySaveReqVO[]
}

export interface FactoryTypeVO {
  id?: number
  type: number
  name: string
  createTime?: Date
  updateTime?: Date
  creator?: string
  updater?: string
  deleted?: boolean
}

// 查询工时类型列表
export const FactoryTypeList = () => {
  return request.get({ url: '/bpm/factory-type/get-type' })
}

// 查询工作时间配置详情
export const getWorkTimeConfig = (id: number) => {
  return request.get({ url: '/bpm/work-time-config/get?id=' + id })
}

// 查询工作时间配置列表
export const getFactoryConfigPage = (params: any) => {
  return request.get({ url: '/bpm/factory/page', params })
}

// 新增工作时间配置
export const createFactoryConfig = (data) => {
  return request.post({ url: '/bpm/factory/create', data })
}

// 批量新增工作时间配置
export const batchCreateWorkTimeConfig = (data: WorkTimeConfigBatchSaveReqVO) => {
  return request.post({ url: '/bpm/factory/batch-create', data })
}

// 修改工作时间配置
export const updateFactoryConfig = (data) => {
  return request.put({ url: '/bpm/factory/update', data })
}

// 删除工作时间配置
export const deleteFactoryConfig = (id: number) => {
  return request.delete({ url: '/bpm/factory/delete?id=' + id })
}

// 新增工时类型
export const createFactoryType = (data: FactoryTypeVO) => {
  return request.post({ url: '/bpm/factory-type/create', data })
}

// 修改工时类型
export const updateFactoryType = (data: FactoryTypeVO) => {
  return request.put({ url: '/bpm/factory-type/update', data })
}

// 删除工时类型
export const deleteFactoryType = (id: number) => {
  return request.delete({ url: '/bpm/factory-type/delete?id=' + id })
}
