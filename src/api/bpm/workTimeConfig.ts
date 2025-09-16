import request from '@/config/axios'

export interface WorkTimeConfigVO {
  id?: number
  type: number
  date: number[] | string
  startTime: number[] | string
  endTime: number[] | string
  createTime?: Date
}

export interface WorkTimeConfigSaveReqVO {
  id?: number
  type: number
  date: string
  startTime: string
  endTime: string
}

export interface WorkTimeConfigBatchSaveReqVO {
  configs: WorkTimeConfigSaveReqVO[]
}

export interface WorkTimeTypeVO {
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
export const getWorkTimeTypeList = () => {
  return request.get({ url: '/bpm/work-time-config/get-type' })
}

// 查询工作时间配置详情
export const getWorkTimeConfig = (id: number) => {
  return request.get({ url: '/bpm/work-time-config/get?id=' + id })
}

// 查询工作时间配置列表
export const getWorkTimeConfigPage = (params: any) => {
  return request.get({ url: '/bpm/work-time-config/page', params })
}

// 新增工作时间配置
export const createWorkTimeConfig = (data) => {
  return request.post({ url: '/bpm/work-time-config/create', data })
}

// 批量新增工作时间配置
export const batchCreateWorkTimeConfig = (data: WorkTimeConfigBatchSaveReqVO) => {
  return request.post({ url: '/bpm/work-time-config/batch-create', data })
}

// 修改工作时间配置
export const updateWorkTimeConfig = (data: WorkTimeConfigVO) => {
  return request.put({ url: '/bpm/work-time-config/update', data })
}

// 删除工作时间配置
export const deleteWorkTimeConfig = (id: number) => {
  return request.delete({ url: '/bpm/work-time-config/delete?id=' + id })
}

// 新增工时类型
export const createWorkTimeType = (data: WorkTimeTypeVO) => {
  return request.post({ url: '/bpm/work-time-config/create-type', data })
}

// 修改工时类型
export const updateWorkTimeType = (data: WorkTimeTypeVO) => {
  return request.put({ url: '/bpm/work-time-config/update-type', data })
}

// 删除工时类型
export const deleteWorkTimeType = (id: number) => {
  return request.delete({ url: '/bpm/work-time-config/delete-type?id=' + id })
}
