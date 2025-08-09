import request from '@/config/axios'

export interface TaskTransferConfigVO {
  id: number
  fromUserId: number
  toUserId: number
  modelId: string
  modelVersion: number
  startTime: number | string
  endTime: number | string
  reason: string
  createTime: number | string
  // 补充显示字段
  fromUserName?: string
  toUserName?: string
  status?: number
  creator?: string
  modelName?: string
}

export interface TaskTransferConfigPageReqVO {
  fromUserId?: number
  status?: string | number
  modelId?: string
  modelVersion?: number
  pageNo: number
  pageSize: number
}

export interface TaskTransferConfigSaveReqVO {
  id?: number
  fromUserId: number
  toUserId: number
  modelId?: string
  modelVersion?: number
  startTime: number
  endTime: number
  reason?: string
}

// 创建任务转移配置
export const createTaskTransferConfig = (data: TaskTransferConfigSaveReqVO) => {
  return request.post({ url: '/bpm/task-transfer-config/create', data })
}

// 更新任务转移配置
export const updateTaskTransferConfig = (data: TaskTransferConfigSaveReqVO) => {
  return request.put({ url: '/bpm/task-transfer-config/update', data })
}

// 删除任务转移配置
export const deleteTaskTransferConfig = (id: number) => {
  return request.delete({ url: `/bpm/task-transfer-config/delete?id=${id}` })
}

// 获取任务转移配置
export const getTaskTransferConfig = (id: number) => {
  return request.get({ url: `/bpm/task-transfer-config/get?id=${id}` })
}

// 获取任务转移配置分页
export const getTaskTransferConfigPage = (params: TaskTransferConfigPageReqVO) => {
  return request.get({ url: '/bpm/task-transfer-config/page', params })
}

// 撤销任务转移配置
export const revokeTaskTransferConfig = (id: number) => {
  return request.put({ url: `/bpm/task-transfer-config/revoke?id=${id}` })
} 