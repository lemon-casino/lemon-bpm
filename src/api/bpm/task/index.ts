import request from '@/config/axios'

/**
 * 任务状态枚举
 */
export enum TaskStatusEnum {
  /**
   * 未开始
   */
  NOT_START = -1,

  /**
   * 待审批
   */
  WAIT = 0,
  /**
   * 审批中
   */
  RUNNING = 1,
  /**
   * 审批通过
   */
  APPROVE = 2,

  /**
   * 审批不通过
   */
  REJECT = 3,

  /**
   * 已取消
   */
  CANCEL = 4,
  /**
   * 已退回
   */
  RETURN = 5,
  /**
   * 审批通过中
   */
  APPROVING = 7
}

// 批量转办运行中任务请求 VO
export interface BpmTaskTransferAllReqVO {
  fromUserId: number // 当前审批人用户编号
  toUserId: number // 新审批人的用户编号
  reason: string // 转办原因
  modelId?: string // 流程模型编号
  version?: number // 流程版本号
}

// 暂存任务表单请求 VO
export interface BpmTaskSaveReqVO {
  id: string // 任务编号
  variables?: Record<string, any> // 表单变量
}

export const getTaskTodoPage = async (data: any) => {
  return await request.post({ url: '/bpm/task/todo-page', data })
}

export const getTaskDonePage = async (data: any) => {
  return await request.post({ url: '/bpm/task/done-page', data })
}

export const getTaskManagerPage = async (params: any) => {
  return await request.get({ url: '/bpm/task/manager-page', params })
}

export const approveTask = async (data: any) => {
  return await request.put({ url: '/bpm/task/approve', data })
}

export const wardenApproveTask = async (data: any) => {
  return await request.put({ url: '/bpm/task/warden-approve', data })
}
export const rejectTask = async (data: any) => {
  return await request.put({ url: '/bpm/task/reject', data })
}

// 暂存任务表单
export const saveTaskForm = async (data: BpmTaskSaveReqVO) => {
  return await request.put({ url: '/bpm/task/save', data })
}

export const getTaskListByProcessInstanceId = async (processInstanceId: string) => {
  return await request.get({
    url: '/bpm/task/list-by-process-instance-id?processInstanceId=' + processInstanceId
  })
}

// 获取所有可退回的节点
export const getTaskListByReturn = async (id: string) => {
  return await request.get({ url: '/bpm/task/list-by-return', params: { id } })
}

// 退回
export const returnTask = async (data: any) => {
  return await request.put({ url: '/bpm/task/return', data })
}

// 委派
export const delegateTask = async (data: any) => {
  return await request.put({ url: '/bpm/task/delegate', data })
}

// 转派
export const transferTask = async (data: any) => {
  return await request.put({ url: '/bpm/task/transfer', data })
}

// 加签
export const signCreateTask = async (data: any) => {
  return await request.put({ url: '/bpm/task/create-sign', data })
}

// 减签
export const signDeleteTask = async (data: any) => {
  return await request.delete({ url: '/bpm/task/delete-sign', data })
}

// 抄送
export const copyTask = async (data: any) => {
  return await request.put({ url: '/bpm/task/copy', data })
}

// 获取我的待办任务
export const myTodoTask = async (processInstanceId: string) => {
  return await request.get({ url: '/bpm/task/my-todo?processInstanceId=' + processInstanceId })
}

// 获取减签任务列表
export const getChildrenTaskList = async (id: string) => {
  return await request.get({ url: '/bpm/task/list-by-parent-task-id?parentTaskId=' + id })
}

// 催办
export interface BpmTaskUrgeReqVO {
  processInstanceId: string // 流程实例的编号
  urgeList: { // 催办的用户列表
    userId: number // 用户编号
    processName: string // 流程名称
    url: string // 流程的 URL
    message: string // 催办的消息
  }[]
}

export const urgeTask = async (data: BpmTaskUrgeReqVO) => {
  return await request.put({ url: '/bpm/process-instance/comment/urge', data })
}

// 批量转办运行中的任务
export const transferRunningTasks = async (data: BpmTaskTransferAllReqVO) => {
  return await request.put({ url: '/bpm/task/transfer-running', data })
}

// 获取运行中的任务列表
export const getRunningTaskList = async (id: string) => {
  return await request.get({ url: '/bpm/task/running-list', params: { id } })
}
